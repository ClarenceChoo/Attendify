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
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-violet-700">Attendify</h1>
          <div className="flex items-center gap-4">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 sm:inline-flex">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-rose-600 hover:text-rose-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-lg">
          <p className="text-sm text-violet-100">Student Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold">Welcome back, {user?.name}</h2>
          <p className="mt-1 text-sm text-violet-100">
            Track your participation and check in to ongoing events.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Events Attended</p>
            <p className="text-3xl font-bold text-violet-700">
              {myAttendances?.stats?.totalAttended || 0}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Engagement Score</p>
            <p className="text-3xl font-bold text-blue-600">
              {Math.min(100, (myAttendances?.stats?.totalAttended || 0) * 20)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Badges Earned</p>
            <p className="text-3xl font-bold text-emerald-600">
              {myAttendances?.stats?.badges?.length || 0}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('events')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'events'
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Upcoming Events
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'history'
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-100'
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
                  <p className="text-slate-500">No upcoming events</p>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="cursor-pointer rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {event.title}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {event.venue} • {event.category}
                          </p>
                          <p className="text-xs text-slate-500">
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
                    <h4 className="mb-3 font-semibold text-slate-800">
                      Your Badges
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {myAttendances.stats.badges.map((badge: any) => (
                        <div
                          key={badge.name}
                          className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-100 p-4 text-center"
                        >
                          <p className="text-3xl mb-1">{badge.icon}</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {badge.name}
                          </p>
                          <p className="text-xs text-slate-600">
                            {badge.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">
                    Attendance History
                  </h4>
                  {myAttendances?.attendances?.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No attendance records yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {myAttendances?.attendances?.map((att: any) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {att.eventTitle}
                            </p>
                            <p className="text-xs text-slate-600">
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
