import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api'

export const EventManagementPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState<any>(null)
  const [attendances, setAttendances] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      </div>
    </div>
  )
}
