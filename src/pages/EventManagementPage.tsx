import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api'

export const EventManagementPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState<any>(null)
  const [attendances, setAttendances] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qrEnabled, setQrEnabled] = useState(false)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [qrIntervalId, setQrIntervalId] = useState<number | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null)
  const [progressPercent, setProgressPercent] = useState<number>(100)
  const [progressIntervalId, setProgressIntervalId] = useState<number | null>(null)

  useEffect(() => {
    if (!token || !eventId) return

    const loadData = async () => {
      try {
        const [eventData, attendanceData] = await Promise.all([
          apiClient.getEvent(token, eventId),
          apiClient.getAttendances(token, eventId),
        ])
        setEvent(eventData)
        setAttendances(attendanceData)
      } catch (err) {
        console.error('Failed to load data', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Poll for updates every 5 seconds
    const interval = setInterval(loadData, 5000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [token, eventId])

  // Cleanup QR generation interval when component unmounts
  useEffect(() => {
    return () => {
      if (qrIntervalId) {
        clearInterval(qrIntervalId)
      }
    }
  }, [qrIntervalId])

  const handleStartEvent = async () => {
    if (!token || !eventId) return
    try {
      const updated = await apiClient.startEvent(token, eventId)
      setEvent(updated)
    } catch (err) {
      console.error('Failed to start event', err)
    }
  }

  const handleEndEvent = async () => {
    if (!token || !eventId) return
    try {
      const updated = await apiClient.endEvent(token, eventId)
      setEvent(updated)
    } catch (err) {
      console.error('Failed to end event', err)
    }
  }

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="surface-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-black" />
          <p className="text-sm text-slate-600">Loading event operations...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Event not found</p>
      </div>
    )
  }

  const currentRate = Math.round(
    (attendances?.summary?.totalScanned / event.expectedAttendees) * 100
  )

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-container !py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/organiser')}
            className="text-sm font-semibold text-slate-600 hover:text-slate-800"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Event Manager</h1>
          <div></div>
        </div>
      </nav>

      <div className="app-container">
        <div className="mb-8 rounded-2xl border border-stone-700 bg-gradient-to-r from-black to-stone-800 p-6 text-stone-100 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-stone-300">Live Event Mode</p>
              <h1 className="text-3xl font-bold">{event.title}</h1>
            </div>
            <span
              className={`status-pill bg-white/20 text-white ${
                event.status === 'ongoing' ? 'animate-pulse' : ''
              }`}
            >
              {event.status}
            </span>
          </div>
          <p className="text-sm text-stone-300">
            {event.venue} • {event.category} • {new Date(event.startTime).toLocaleString()}
          </p>
        </div>

        <div className="surface-card mb-8 p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-slate-800">Operations Controls</h2>
            <div className="flex gap-2">
              {event.status === 'draft' && (
                <button
                  onClick={handleStartEvent}
                  className="btn-success"
                >
                  Start Check-In
                </button>
              )}
              {event.status === 'ongoing' && (
                <button
                  onClick={handleEndEvent}
                  className="btn-danger"
                >
                  End Event
                </button>
              )}
            </div>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-stone-200 bg-gradient-to-br from-stone-50 to-stone-100 p-4">
              <p className="text-sm font-semibold text-slate-600">Total Scans</p>
              <p className="text-3xl font-bold text-neutral-900">
                {attendances?.summary?.totalScanned}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-gradient-to-br from-stone-50 to-stone-100 p-4">
              <p className="text-sm font-semibold text-slate-600">
                Attendance Rate
              </p>
              <p className="text-3xl font-bold text-neutral-900">{currentRate}%</p>
            </div>

            <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-yellow-50 to-yellow-100 p-4">
              <p className="text-sm font-semibold text-slate-600">Late Arrivals</p>
              <p className="text-3xl font-bold text-yellow-600">
                {attendances?.summary?.byStatus?.late || 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-600">
                Suspicious Activity
              </p>
              <p className="text-3xl font-bold text-slate-700">
                {attendances?.summary?.suspiciousActivity?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Suspicious Activity Alert */}
        {attendances?.summary?.suspiciousActivity &&
          attendances.summary.suspiciousActivity.length > 0 && (
            <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <h3 className="font-bold text-red-800 mb-3">
                🚨 Suspicious Activity Detected
              </h3>
              {attendances.summary.suspiciousActivity.map(
                (activity: any, idx: number) => (
                  <div key={idx} className="text-sm text-red-700 mb-2">
                    <strong>{activity.type}</strong>: {activity.scanCount} scans
                    from same device ({activity.deviceId})
                  </div>
                )
              )}
            </div>
          )}

        {/* Attendance Table */}
        <div className="surface-card p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            Attendee List
          </h2>

          {attendances?.attendances?.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No check-ins yet. Event status: <strong>{event.status}</strong>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Phase
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendances?.attendances?.map((att: any) => (
                    <tr key={att.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {att.userEmail}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(att.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            att.status === 'late'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {att.status || 'Attended'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{att.phase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {event.status === 'completed' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() =>
                  apiClient.exportCSV(token!, eventId!).catch(console.error)
                }
                className="btn-success px-6"
              >
                📊 Export CSV
              </button>
            </div>
          )}
        </div>

        {/* QR Code Section */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Live QR Code</h3>
          <div className="flex items-center gap-3">
            {user && event.organiserId === user.id ? (
              <button
                onClick={async () => {
                  if (!token || !eventId) return
                  if (!qrEnabled) {
                    setQrEnabled(true)
                    setQrModalOpen(true)

                    // Generate immediately and then every 20s to match token expiry
                    const generateOnce = async () => {
                      try {
                        const resp = await apiClient.generateToken(token!, eventId!)

                        // Prefer server-provided QR data URL
                        if (resp.qrDataUrl) {
                          setQrImage(resp.qrDataUrl)
                        } else if (resp.scanUrl) {
                          // Fallback to external QR service
                          const data = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(resp.scanUrl)}`)
                          const blob = await data.blob()
                          const objectUrl = URL.createObjectURL(blob)
                          setQrImage(objectUrl)
                        }

                        // Set expiry and start progress bar
                        if (resp.expiresAt) {
                          const exp = Number(resp.expiresAt)
                          setTokenExpiresAt(exp)

                          // clear existing progress interval
                          if (progressIntervalId) {
                            clearInterval(progressIntervalId)
                            setProgressIntervalId(null)
                          }

                          // update progress every 200ms
                          const pid = window.setInterval(() => {
                            const now = Date.now()
                            const total = 20000
                            const remaining = Math.max(0, exp - now)
                            const pct = Math.max(0, (remaining / total) * 100)
                            setProgressPercent(pct)
                          }, 200)
                          setProgressIntervalId(pid)
                        }
                      } catch (err) {
                        console.error('Failed to generate QR', err)
                      }
                    }

                    await generateOnce()
                    const id = window.setInterval(generateOnce, 20000)
                    setQrIntervalId(id)
                  } else {
                    // Disable and close modal
                    setQrEnabled(false)
                    setQrModalOpen(false)
                    if (qrIntervalId) {
                      clearInterval(qrIntervalId)
                      setQrIntervalId(null)
                    }
                    if (progressIntervalId) { clearInterval(progressIntervalId); setProgressIntervalId(null) }
                    setTokenExpiresAt(null)
                    setProgressPercent(100)
                    setQrImage(null)
                  }
                }}
                className={`px-4 py-2 rounded ${qrEnabled ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                {qrEnabled ? 'Disable QR' : 'Enable QR'}
              </button>
            ) : (
              <div className="text-sm text-slate-600">Only the event organiser can generate the live QR code.</div>
            )}
          </div>

          {/* Modal popup for live QR */}
          {qrModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => {
                // clicking backdrop closes and disables QR
                setQrEnabled(false)
                setQrModalOpen(false)
                if (qrIntervalId) { clearInterval(qrIntervalId); setQrIntervalId(null) }
                if (progressIntervalId) { clearInterval(progressIntervalId); setProgressIntervalId(null) }
                setTokenExpiresAt(null)
                setProgressPercent(100)
                setQrImage(null)
              }} />

              <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-bold">Live QR — {event.title}</h4>
                  <button onClick={() => {
                    setQrEnabled(false)
                    setQrModalOpen(false)
                    if (qrIntervalId) { clearInterval(qrIntervalId); setQrIntervalId(null) }
                    if (progressIntervalId) { clearInterval(progressIntervalId); setProgressIntervalId(null) }
                    setTokenExpiresAt(null)
                    setProgressPercent(100)
                    setQrImage(null)
                  }} className="text-sm font-semibold text-slate-600">Close</button>
                </div>

                <div className="mt-4 text-center">
                  {qrImage ? (
                    <img src={qrImage} alt="Live QR" className="mx-auto h-64 w-64 rounded-md border bg-white p-2" />
                  ) : (
                    <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-md bg-slate-100">
                      <p className="text-slate-500">Generating QR...</p>
                    </div>
                  )}

                  <div className="mt-4 text-sm text-slate-600">
                    <p>This QR refreshes every 20 seconds. Scan to check in attendees.</p>
                  </div>

                  {/* 20s progress bar */}
                  <div className="mt-4">
                    <div className="mx-auto mb-2 max-w-xs">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-neutral-900 transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-600 text-center">
                        {tokenExpiresAt ? `${Math.max(0, Math.ceil((tokenExpiresAt - Date.now()) / 1000))}s` : '20s'} remaining
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
