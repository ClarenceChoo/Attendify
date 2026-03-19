import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api'

export const OrganiserDashboard: React.FC = () => {
  const { token, user, logout, isOrganiser } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState<any[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    category: 'welfare',
    venue: '',
    startTime: '',
    endTime: '',
    expectedAttendees: '50',
  })

  useEffect(() => {
    if (!token || !isOrganiser) {
      navigate('/')
      return
    }

    loadEvents()
  }, [token, navigate, isOrganiser])

  const loadEvents = async () => {
    try {
      const data = await apiClient.getOrganiserSummary(token!)
      setEvents([...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err) {
      console.error('Failed to load events', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await apiClient.createEvent(token!, {
        title: formData.title,
        category: formData.category,
        venue: formData.venue,
        startTime: formData.startTime,
        endTime: formData.endTime,
        expectedAttendees: parseInt(formData.expectedAttendees),
      })

      setFormData({
        title: '',
        category: 'welfare',
        venue: '',
        startTime: '',
        endTime: '',
        expectedAttendees: '50',
      })
      setShowCreateForm(false)
      loadEvents()
    } catch (err) {
      console.error('Failed to create event', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const activeEvents = events.filter((event) => event.status === 'ongoing').length
  const completedEvents = events.filter((event) => event.status === 'completed').length
  const averageRate =
    events.length > 0
      ? Math.round(
          events.reduce((total, event) => {
            const numeric = Number.parseInt(String(event.attendanceRate).replace('%', ''), 10)
            return total + (Number.isNaN(numeric) ? 0 : numeric)
          }, 0) / events.length
        )
      : 0

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="surface-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-black" />
          <p className="text-sm text-slate-600">Loading organiser workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-container !py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Attendify Organiser</h1>
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
          <p className="text-sm text-stone-300">Operations Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold">Run events in real-time</h2>
          <p className="mt-1 text-sm text-stone-300">
            Create events, monitor attendance live, and export results instantly.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="metric-card border-stone-200">
            <p className="text-sm text-slate-500">Total Events</p>
            <p className="text-3xl font-bold text-neutral-900">{events.length}</p>
          </div>
          <div className="metric-card border-stone-200">
            <p className="text-sm text-slate-500">Live Now</p>
            <p className="text-3xl font-bold text-neutral-900">{activeEvents}</p>
          </div>
          <div className="metric-card border-stone-200">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-3xl font-bold text-neutral-900">{completedEvents}</p>
          </div>
          <div className="metric-card border-amber-100">
            <p className="text-sm text-slate-500">Avg Attendance</p>
            <p className="text-3xl font-bold text-amber-600">{averageRate}%</p>
          </div>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary px-6"
          >
            + Create Event
          </button>
        </div>

        {showCreateForm && (
          <div className="surface-card mb-8 p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Create New Event
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-black focus:ring-4 focus:ring-stone-200"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-black focus:ring-4 focus:ring-stone-200"
                  >
                    <option value="welfare">Welfare</option>
                    <option value="workshop">Workshop</option>
                    <option value="sports">Sports</option>
                    <option value="cca">CCA/IG</option>
                    <option value="orientation">Orientation</option>
                    <option value="meeting">House Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) =>
                      setFormData({ ...formData, venue: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-black focus:ring-4 focus:ring-stone-200"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expected Attendees
                  </label>
                  <input
                    type="number"
                    value={formData.expectedAttendees}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedAttendees: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-black focus:ring-4 focus:ring-stone-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-black focus:ring-4 focus:ring-stone-200"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-black focus:ring-4 focus:ring-stone-200"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="btn-success px-6"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-muted px-6"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Your Events</h2>

          {events.length === 0 ? (
            <div className="empty-panel">
              <p className="font-semibold text-slate-600">No events created yet</p>
              <p className="mt-1 text-xs">Create your first event to start live attendance operations.</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="surface-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {event.title}
                    </h3>
                    <p className="text-slate-600">
                      {event.venue} • {event.category}
                    </p>
                    <p className="text-sm text-slate-500">
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
                    {event.status.toUpperCase()}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-sm text-slate-600">Attendance</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {event.attendanceCount}/{event.expectedAttendees}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Rate</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {event.attendanceRate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Created</p>
                    <p className="text-sm text-slate-700">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/organiser/events/${event.id}`)}
                    className="btn-primary"
                  >
                    Manage Event
                  </button>
                  <button
                    onClick={() =>
                      apiClient.exportCSV(token!, event.id).catch(console.error)
                    }
                    className="btn-success"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
