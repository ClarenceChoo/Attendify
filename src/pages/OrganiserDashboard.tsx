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
      setEvents(data)
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
          <h1 className="text-2xl font-bold text-violet-700">Attendify Organiser</h1>
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
          <p className="text-sm text-violet-100">Operations Dashboard</p>
          <h2 className="mt-1 text-2xl font-bold">Run events in real-time</h2>
          <p className="mt-1 text-sm text-violet-100">
            Create events, monitor attendance live, and export results instantly.
          </p>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-xl bg-violet-600 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            + Create Event
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white transition hover:bg-emerald-700"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-xl bg-slate-200 px-6 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-300"
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
            <p className="text-slate-500">No events created yet</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      event.status === 'ongoing'
                        ? 'bg-green-100 text-green-700'
                        : event.status === 'completed'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {event.status.toUpperCase()}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-sm text-slate-600">Attendance</p>
                    <p className="text-2xl font-bold text-violet-700">
                      {event.attendanceCount}/{event.expectedAttendees}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
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
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
                  >
                    Manage Event
                  </button>
                  <button
                    onClick={() =>
                      apiClient.exportCSV(token!, event.id).catch(console.error)
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
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
