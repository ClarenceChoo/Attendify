import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import dotenv from 'dotenv'
import QRCode from 'qrcode'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'
const TOKEN_REFRESH_INTERVAL = 30000 // 30 seconds

// Middleware
app.use(cors())
app.use(express.json())

// =============================================================================
// IN-MEMORY STORAGE (for hackathon; use database in production)
// =============================================================================
const events = new Map()
const attendances = new Map()
const users = new Map()

// Pre-populate some test data
users.set('student1@u.nus.edu', {
  id: 'user-1',
  email: 'student1@u.nus.edu',
  name: 'Test Student 1',
})
users.set('org1@u.nus.edu', {
  id: 'user-2',
  email: 'org1@u.nus.edu',
  name: 'Event Organiser 1',
  role: 'organiser',
})

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

// Mock login endpoint (in production: Google OAuth)
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body

  if (!email || !email.endsWith('@u.nus.edu')) {
    return res.status(400).json({
      error: 'Please use a valid NUS email (@u.nus.edu)',
    })
  }

  // Create or fetch user
  let user = users.get(email)
  if (!user) {
    const id = `user-${Date.now()}`
    user = {
      id,
      email,
      name: email.split('@')[0],
      role: 'student',
    }
    users.set(email, user)
  }

  // Issue JWT
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  )

  res.json({
    token,
    user,
  })
})

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// =============================================================================
// ROTATING TOKEN SERVICE
// =============================================================================

// Generate signed rotating QR token valid for 30 seconds
const generateRotatingToken = (eventId) => {
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = {
    eventId,
    timestamp,
    nonce: crypto.randomBytes(8).toString('hex'),
  }

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex')

  return `${Buffer.from(JSON.stringify(payload)).toString('base64')}.${signature}`
}

const verifyRotatingToken = (token, eventId) => {
  try {
    const [encoded, signature] = token.split('.')
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString())

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' }
    }

    // Check token age (must be within 30s)
    const tokenAge = Math.floor(Date.now() / 1000) - payload.timestamp
    if (tokenAge > 30) {
      return { valid: false, error: 'Token expired' }
    }

    if (payload.eventId !== eventId) {
      return { valid: false, error: 'Token event mismatch' }
    }

    return { valid: true, payload }
  } catch (error) {
    return { valid: false, error: 'Invalid token format' }
  }
}

// Stream rotating tokens every 30s
app.get('/api/events/:eventId/qr-stream', verifyToken, (req, res) => {
  const { eventId } = req.params
  const event = events.get(eventId)

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.organiserId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorised' })
  }

  // SSE stream for real-time QR updates
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendQR = async () => {
    const token = generateRotatingToken(eventId)
    const qrData = {
      token,
      refreshAt: Date.now() + TOKEN_REFRESH_INTERVAL,
      expiresAt: Date.now() + TOKEN_REFRESH_INTERVAL + 5000,
    }

    try {
      const qrCode = await QRCode.toDataURL(token)
      res.write(`data: ${JSON.stringify({ ...qrData, qrCode })}\n\n`)
    } catch (err) {
      res.write(`data: ${JSON.stringify(qrData)}\n\n`)
    }
  }

  sendQR()
  const interval = setInterval(sendQR, TOKEN_REFRESH_INTERVAL)

  req.on('close', () => {
    clearInterval(interval)
    res.end()
  })
})

// =============================================================================
// EVENT ENDPOINTS
// =============================================================================

app.post('/api/events', verifyToken, (req, res) => {
  const { title, category, venue, startTime, endTime, expectedAttendees } =
    req.body

  if (!title || !category || !venue) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const eventId = `event-${Date.now()}`
  const event = {
    id: eventId,
    title,
    category,
    venue,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    expectedAttendees: expectedAttendees || 50,
    organiserId: req.user.id,
    status: 'draft', // draft, ongoing, completed
    checkInPhase: null,
    checkOutPhase: null,
    createdAt: new Date(),
  }

  events.set(eventId, event)

  res.json({
    id: eventId,
    ...event,
  })
})

app.get('/api/events', verifyToken, (req, res) => {
  const userEvents = Array.from(events.values()).filter((e) => {
    const isOrganiser = e.organiserId === req.user.id
    const isFuture =
      new Date(e.startTime) > new Date() ||
      e.status === 'ongoing' ||
      e.status === 'completed'

    return isOrganiser || isFuture
  })

  res.json(userEvents)
})

app.get('/api/events/:eventId', verifyToken, (req, res) => {
  const event = events.get(req.params.eventId)

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  // Get attendance stats
  const attendances_for_event = Array.from(attendances.values()).filter(
    (a) => a.eventId === req.params.eventId
  )

  res.json({
    ...event,
    attendanceCount: attendances_for_event.length,
    attendances: attendances_for_event,
  })
})

app.patch('/api/events/:eventId/start', verifyToken, (req, res) => {
  const event = events.get(req.params.eventId)

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.organiserId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorised' })
  }

  event.status = 'ongoing'
  event.checkInPhase = {
    startedAt: new Date(),
    endedAt: null,
  }

  events.set(req.params.eventId, event)

  res.json(event)
})

app.patch('/api/events/:eventId/end', verifyToken, (req, res) => {
  const event = events.get(req.params.eventId)

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.organiserId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorised' })
  }

  event.status = 'completed'
  if (event.checkInPhase) {
    event.checkInPhase.endedAt = new Date()
  }

  events.set(req.params.eventId, event)

  res.json(event)
})

// =============================================================================
// SCAN & ATTENDANCE ENDPOINTS
// =============================================================================

app.post('/api/scan', verifyToken, (req, res) => {
  const { token, eventId } = req.body

  const event = events.get(eventId)
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  // Verify rotating token
  const verification = verifyRotatingToken(token, eventId)
  if (!verification.valid) {
    return res.status(400).json({ error: verification.error })
  }

  // Check for duplicate scan in same phase
  const existingAttendance = Array.from(attendances.values()).find(
    (a) =>
      a.eventId === eventId &&
      a.userId === req.user.id &&
      a.phase === 'check-in'
  )

  if (existingAttendance) {
    return res.status(409).json({
      error: 'Already checked in',
      timestamp: existingAttendance.timestamp,
    })
  }

  // Record attendance
  const attendanceId = `attendance-${Date.now()}`
  const attendance = {
    id: attendanceId,
    eventId,
    userId: req.user.id,
    userEmail: req.user.email,
    phase: 'check-in',
    timestamp: new Date(),
    deviceId: req.body.deviceId || null,
  }

  attendances.set(attendanceId, attendance)

  // Compute status
  let status = 'attended'
  if (event.checkInPhase) {
    const eventStart = new Date(event.startTime)
    if (new Date() > new Date(eventStart.getTime() + 15 * 60000)) {
      status = 'late'
    }
  }

  res.json({
    success: true,
    attendance: {
      ...attendance,
      status,
    },
  })
})

// =============================================================================
// ATTENDANCE ANALYTICS
// =============================================================================

app.get('/api/events/:eventId/attendances', verifyToken, (req, res) => {
  const event = events.get(req.params.eventId)

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.organiserId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorised' })
  }

  const eventAttendances = Array.from(attendances.values()).filter(
    (a) => a.eventId === req.params.eventId
  )

  // Compute summary stats
  const summary = {
    totalScanned: eventAttendances.length,
    expected: event.expectedAttendees,
    percentage: Math.round(
      (eventAttendances.length / event.expectedAttendees) * 100
    ),
    byStatus: {
      attended: eventAttendances.filter((a) => a.status === 'attended').length,
      late: eventAttendances.filter((a) => a.status === 'late').length,
    },
    suspiciousActivity: detectSuspiciousScans(eventAttendances),
  }

  res.json({
    attendances: eventAttendances,
    summary,
  })
})

const detectSuspiciousScans = (attendances) => {
  const suspicious = []

  // Duplicate scans from same device in short time window
  const deviceMap = {}
  attendances.forEach((a) => {
    if (!a.deviceId) return
    if (!deviceMap[a.deviceId]) {
      deviceMap[a.deviceId] = []
    }
    deviceMap[a.deviceId].push(a)
  })

  Object.entries(deviceMap).forEach(([deviceId, scans]) => {
    if (scans.length > 1) {
      suspicious.push({
        type: 'MULTIPLE_SCANS_SAME_DEVICE',
        deviceId,
        scanCount: scans.length,
        userIds: scans.map((s) => s.userId),
      })
    }
  })

  return suspicious
}

// =============================================================================
// CSV EXPORT
// =============================================================================

app.get('/api/events/:eventId/export-csv', verifyToken, (req, res) => {
  const event = events.get(req.params.eventId)

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.organiserId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorised' })
  }

  const eventAttendances = Array.from(attendances.values()).filter(
    (a) => a.eventId === req.params.eventId
  )

  const csv = [
    ['Email', 'Timestamp', 'Status', 'Phase'].join(','),
    ...eventAttendances.map((a) =>
      [a.userEmail, a.timestamp, a.status || 'attended', a.phase].join(',')
    ),
  ].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="event-${req.params.eventId}-attendances.csv"`
  )
  res.send(csv)
})

// =============================================================================
// STUDENT DASHBOARD
// =============================================================================

app.get('/api/me/attendances', verifyToken, (req, res) => {
  const userAttendances = Array.from(attendances.values())
    .filter((a) => a.userId === req.user.id)
    .map((a) => {
      const event = events.get(a.eventId)
      return {
        ...a,
        eventTitle: event?.title,
        eventCategory: event?.category,
      }
    })

  // Compute badges
  const badges = computeBadges(userAttendances)

  res.json({
    attendances: userAttendances,
    stats: {
      totalAttended: userAttendances.length,
      categoryCounts: groupByCategory(userAttendances),
      badges,
    },
  })
})

const groupByCategory = (attendances) => {
  const counts = {}
  attendances.forEach((a) => {
    if (a.eventCategory) {
      counts[a.eventCategory] = (counts[a.eventCategory] || 0) + 1
    }
  })
  return counts
}

const computeBadges = (attendances) => {
  const badges = []

  // Community Builder: attended 5+ events
  if (attendances.length >= 5) {
    badges.push({
      name: 'Community Builder',
      icon: '🏢',
      description: 'Attended 5+ events',
    })
  }

  // Night Owl: attended 3+ evening events
  const eveningEvents = attendances.filter((a) => {
    const hour = new Date(a.timestamp).getHours()
    return hour >= 18 || hour < 6
  })
  if (eveningEvents.length >= 3) {
    badges.push({
      name: 'Night Owl',
      icon: '🌙',
      description: 'Attended 3+ evening events',
    })
  }

  // Category specialist: 5+ in single category
  const categories = groupByCategory(attendances)
  Object.entries(categories).forEach(([cat, count]) => {
    if (count >= 5) {
      badges.push({
        name: `${cat} Enthusiast`,
        icon: '⭐',
        description: `Attended 5+ ${cat} events`,
      })
    }
  })

  return badges
}

// =============================================================================
// ORGANISER DASHBOARD
// =============================================================================

app.get('/api/organiser/summary', verifyToken, (req, res) => {
  const organisedEvents = Array.from(events.values()).filter(
    (e) => e.organiserId === req.user.id
  )

  const summary = organisedEvents.map((event) => {
    const eventAttendances = Array.from(attendances.values()).filter(
      (a) => a.eventId === event.id
    )

    return {
      ...event,
      attendanceCount: eventAttendances.length,
      attendanceRate:
        Math.round((eventAttendances.length / event.expectedAttendees) * 100) +
        '%',
    }
  })

  res.json(summary)
})

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// Start server
app.listen(PORT, () => {
  console.log(
    `🎯 Attendify server running on http://localhost:${PORT}`
  )
  console.log(`📚 Test login: student1@u.nus.edu or org1@u.nus.edu`)
})
