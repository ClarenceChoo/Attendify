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
      <div className="app-shell flex items-center justify-center">
        <div className="surface-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-black" />
          <p className="text-sm text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-container !py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Attendify</h1>
          <div className="flex items-center gap-4">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 sm:inline-flex">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="app-container">
        <div className="mb-6 rounded-2xl border border-stone-700 bg-gradient-to-r from-black to-stone-800 p-6 text-stone-100 shadow-lg">
          <p className="text-sm text-stone-300">Student Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold">Welcome back, {user?.name}</h2>
          <p className="mt-1 text-sm text-stone-300">
            Track your participation and check in to ongoing events.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="metric-card border-stone-200">
            <p className="text-sm text-slate-500">Events Attended</p>
            <p className="text-3xl font-bold text-neutral-900">
              {myAttendances?.stats?.totalAttended || 0}
            </p>
          </div>
          <div className="metric-card border-stone-200">
            <p className="text-sm text-slate-500">Engagement Score</p>
            <p className="text-3xl font-bold text-neutral-900">
              {Math.min(100, (myAttendances?.stats?.totalAttended || 0) * 20)}
            </p>
          </div>
          <div className="metric-card border-stone-200">
            <p className="text-sm text-slate-500">Badges Earned</p>
            <p className="text-3xl font-bold text-neutral-900">
              {myAttendances?.stats?.badges?.length || 0}
            </p>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('events')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'events'
                    ? 'bg-neutral-900 text-stone-100'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Upcoming Events
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'history'
                    ? 'bg-neutral-900 text-stone-100'
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
                  <div className="empty-panel">
                    <p className="font-semibold text-slate-600">No upcoming events</p>
                    <p className="mt-1 text-xs">Check back soon for new college activities.</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="cursor-pointer rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
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
                          className={`status-pill ${
                            event.status === 'ongoing'
                              ? 'bg-neutral-900 text-stone-100'
                              : event.status === 'completed'
                                ? 'bg-stone-200 text-stone-700'
                                : 'bg-stone-300 text-stone-800'
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
                          className="rounded-xl border border-stone-200 bg-gradient-to-br from-stone-50 to-stone-100 p-4 text-center"
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
                    <div className="empty-panel">
                      <p className="font-semibold text-slate-600">No attendance records yet</p>
                      <p className="mt-1 text-xs">Attend your first event to start building your profile.</p>
                    </div>
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
                          <span className="rounded bg-stone-200 px-2 py-1 text-xs text-stone-800">
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
