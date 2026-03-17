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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-600">Attendify Organiser</h1>
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
        <div className="mb-8">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            + Create Event
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Create New Event
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) =>
                      setFormData({ ...formData, venue: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Your Events</h2>

          {events.length === 0 ? (
            <p className="text-gray-500">No events created yet</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {event.title}
                    </h3>
                    <p className="text-gray-600">
                      {event.venue} • {event.category}
                    </p>
                    <p className="text-sm text-gray-500">
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

                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded">
                  <div>
                    <p className="text-gray-600 text-sm">Attendance</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {event.attendanceCount}/{event.expectedAttendees}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {event.attendanceRate}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Created</p>
                    <p className="text-sm text-gray-700">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/organiser/events/${event.id}`)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  >
                    Manage Event
                  </button>
                  <button
                    onClick={() =>
                      apiClient.exportCSV(token!, event.id).catch(console.error)
                    }
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
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
