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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/organiser')}
            className="text-gray-600 hover:text-gray-800 text-sm font-semibold"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-purple-600">Event Manager</h1>
          <div></div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{event.title}</h1>
              <p className="text-gray-600 mt-1">
                {event.venue} • {event.category}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(event.startTime).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              {event.status === 'draft' && (
                <button
                  onClick={handleStartEvent}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Start Check-In
                </button>
              )}
              {event.status === 'ongoing' && (
                <button
                  onClick={handleEndEvent}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  End Event
                </button>
              )}
            </div>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-4">
              <p className="text-gray-600 text-sm font-semibold">Total Scans</p>
              <p className="text-3xl font-bold text-purple-600">
                {attendances?.summary?.totalScanned}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-4">
              <p className="text-gray-600 text-sm font-semibold">
                Attendance Rate
              </p>
              <p className="text-3xl font-bold text-blue-600">{currentRate}%</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded p-4">
              <p className="text-gray-600 text-sm font-semibold">Late Arrivals</p>
              <p className="text-3xl font-bold text-yellow-600">
                {attendances?.summary?.byStatus?.late || 0}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded p-4">
              <p className="text-gray-600 text-sm font-semibold">
                Suspicious Activity
              </p>
              <p className="text-3xl font-bold text-red-600">
                {attendances?.summary?.suspiciousActivity?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Suspicious Activity Alert */}
        {attendances?.summary?.suspiciousActivity &&
          attendances.summary.suspiciousActivity.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Attendee List
          </h2>

          {attendances?.attendances?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No check-ins yet. Event status: <strong>{event.status}</strong>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Phase
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendances?.attendances?.map((att: any) => (
                    <tr key={att.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-800 font-semibold">
                        {att.userEmail}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(att.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-gray-600">{att.phase}</td>
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
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition"
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
