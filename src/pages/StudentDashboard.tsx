import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api'

export const StudentDashboard: React.FC = () => {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState<any[]>([])
  const [myAttendances, setMyAttendances] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'events' | 'history'>('events')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const loadData = async () => {
      try {
        const [eventsData, attendancesData] = await Promise.all([
          apiClient.getEvents(token),
          apiClient.getMyAttendances(token),
        ])
        setEvents(eventsData)
        setMyAttendances(attendancesData)
      } catch (err) {
        console.error('Failed to load data', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, navigate])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">Attendify</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Events Attended</p>
            <p className="text-3xl font-bold text-purple-600">
              {myAttendances?.stats?.totalAttended || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Engagement Score</p>
            <p className="text-3xl font-bold text-blue-600">
              {Math.min(100, (myAttendances?.stats?.totalAttended || 0) * 20)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Badges Earned</p>
            <p className="text-3xl font-bold text-green-600">
              {myAttendances?.stats?.badges?.length || 0}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 p-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 font-semibold ${
                  activeTab === 'events'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600'
                }`}
              >
                Upcoming Events
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 font-semibold ${
                  activeTab === 'history'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600'
                }`}
              >
                Attendance History
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'events' && (
              <div className="space-y-4">
                {events.length === 0 ? (
                  <p className="text-gray-500">No upcoming events</p>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {event.venue} • {event.category}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.startTime).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            event.status === 'ongoing'
                              ? 'bg-green-100 text-green-700'
                              : event.status === 'completed'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                {myAttendances?.stats?.badges && myAttendances.stats.badges.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Your Badges
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {myAttendances.stats.badges.map((badge: any) => (
                        <div
                          key={badge.name}
                          className="bg-gradient-to-br from-yellow-100 to-yellow-50 border border-yellow-200 rounded-lg p-4 text-center"
                        >
                          <p className="text-3xl mb-1">{badge.icon}</p>
                          <p className="font-semibold text-sm text-gray-800">
                            {badge.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {badge.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Attendance History
                  </h4>
                  {myAttendances?.attendances?.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      No attendance records yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {myAttendances?.attendances?.map((att: any) => (
                        <div
                          key={att.id}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded"
                        >
                          <div>
                            <p className="font-semibold text-sm">
                              {att.eventTitle}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(att.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            ✓ Attended
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
