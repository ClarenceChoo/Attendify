import React, { useEffect, useState, useRef } from 'react'
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

  // Namelist state
  const [namelistCount, setNamelistCount] = useState<number>(0)
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null)
  const [uploadingNamelist, setUploadingNamelist] = useState(false)
  const [namelistError, setNamelistError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Load namelist and attendance status
  useEffect(() => {
    if (!token || !eventId) return

    const loadNamelistData = async () => {
      try {
        const [namelistData, statusData] = await Promise.all([
          apiClient.getNamelist(token, eventId).catch(() => ({ count: 0 })),
          apiClient.getAttendanceStatus(token, eventId).catch(() => null),
        ])
        setNamelistCount(namelistData.count || 0)
        if (statusData) setAttendanceStatus(statusData)
      } catch (err) {
        console.error('Failed to load namelist data', err)
      }
    }

    loadNamelistData()
    const interval = setInterval(loadNamelistData, 5000)
    return () => clearInterval(interval)
  }, [token, eventId])

  const handleNamelistUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token || !eventId) return

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setNamelistError('Please upload an Excel file (.xlsx, .xls) or CSV file')
      return
    }

    setUploadingNamelist(true)
    setNamelistError('')

    try {
      const result = await apiClient.uploadNamelist(token, eventId, file)
      setNamelistCount(result.count)
      // Reload attendance status
      const statusData = await apiClient.getAttendanceStatus(token, eventId)
      setAttendanceStatus(statusData)
    } catch (err: any) {
      setNamelistError(err.message || 'Failed to upload namelist')
    } finally {
      setUploadingNamelist(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteNamelist = async () => {
    if (!token || !eventId) return
    try {
      await apiClient.deleteNamelist(token, eventId)
      setNamelistCount(0)
      setAttendanceStatus(null)
    } catch (err) {
      console.error('Failed to delete namelist', err)
    }
  }

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

        {/* Namelist Upload */}
        <div className="surface-card mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Namelist</h2>
              <p className="text-sm text-slate-500 mt-1">
                Upload an Excel or CSV file with Name and Email columns to track attendance.
              </p>
            </div>
            {namelistCount > 0 && (
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700">
                {namelistCount} registered
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleNamelistUpload}
              className="hidden"
              id="namelist-upload"
            />
            <label
              htmlFor="namelist-upload"
              className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-3 text-sm font-semibold transition ${
                uploadingNamelist
                  ? 'border-stone-300 bg-stone-50 text-stone-400 cursor-wait'
                  : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500 hover:bg-stone-50'
              }`}
            >
              {uploadingNamelist ? 'Uploading...' : namelistCount > 0 ? 'Replace Namelist' : 'Upload Namelist (.xlsx, .csv)'}
            </label>
            {namelistCount > 0 && (
              <button
                onClick={handleDeleteNamelist}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
              >
                Remove
              </button>
            )}
          </div>

          {namelistError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {namelistError}
            </div>
          )}
        </div>

        {/* Attendance Status (namelist-based tracking) */}
        {attendanceStatus && attendanceStatus.statusList?.length > 0 && (
          <div className="surface-card mb-8 p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-800">Attendance Tracker</h2>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-xl border p-3 text-left transition ${statusFilter === 'all' ? 'border-stone-400 bg-stone-100' : 'border-stone-200 hover:bg-stone-50'}`}
              >
                <p className="text-xs font-semibold text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{attendanceStatus.summary.total}</p>
              </button>
              <button
                onClick={() => setStatusFilter('present')}
                className={`rounded-xl border p-3 text-left transition ${statusFilter === 'present' ? 'border-green-400 bg-green-50' : 'border-green-100 hover:bg-green-50'}`}
              >
                <p className="text-xs font-semibold text-green-600">Present</p>
                <p className="text-2xl font-bold text-green-700">{attendanceStatus.summary.present}</p>
              </button>
              <button
                onClick={() => setStatusFilter('late')}
                className={`rounded-xl border p-3 text-left transition ${statusFilter === 'late' ? 'border-yellow-400 bg-yellow-50' : 'border-yellow-100 hover:bg-yellow-50'}`}
              >
                <p className="text-xs font-semibold text-yellow-600">Late</p>
                <p className="text-2xl font-bold text-yellow-700">{attendanceStatus.summary.late}</p>
              </button>
              <button
                onClick={() => setStatusFilter('absent')}
                className={`rounded-xl border p-3 text-left transition ${statusFilter === 'absent' ? 'border-red-400 bg-red-50' : 'border-red-100 hover:bg-red-50'}`}
              >
                <p className="text-xs font-semibold text-red-600">Absent</p>
                <p className="text-2xl font-bold text-red-700">{attendanceStatus.summary.absent}</p>
              </button>
            </div>

            {/* Filtered table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Check-in Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceStatus.statusList
                    .filter((s: any) => statusFilter === 'all' || s.status === statusFilter)
                    .map((entry: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-800">{entry.name}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                              entry.status === 'present'
                                ? 'bg-green-100 text-green-700'
                                : entry.status === 'late'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {entry.checkInTime ? new Date(entry.checkInTime).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scan Log */}
        <div className="surface-card p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            Scan Log
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
                Export CSV
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
