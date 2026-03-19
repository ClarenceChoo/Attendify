const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const apiClient = {
  async login(email: string, password?: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(password ? { email, password } : { email }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async register(payload: { name: string; email: string; password: string; role: string }) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getEvents(token: string) {
    const res = await fetch(`${API_URL}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getEvent(token: string, eventId: string) {
    const res = await fetch(`${API_URL}/events/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async createEvent(
    token: string,
    event: {
      title: string
      category: string
      venue: string
      startTime: string
      endTime: string
      expectedAttendees: number
    }
  ) {
    const res = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async startEvent(token: string, eventId: string) {
    const res = await fetch(`${API_URL}/events/${eventId}/start`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async endEvent(token: string, eventId: string) {
    const res = await fetch(`${API_URL}/events/${eventId}/end`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async scan(token: string, scanToken: string, eventId: string) {
    const res = await fetch(`${API_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token: scanToken, eventId }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Scan failed')
    }
    return res.json()
  },

  async getAttendances(token: string, eventId: string) {
    const res = await fetch(`${API_URL}/events/${eventId}/attendances`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getMyAttendances(token: string) {
    const res = await fetch(`${API_URL}/me/attendances`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getOrganiserSummary(token: string) {
    const res = await fetch(`${API_URL}/organiser/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async exportCSV(token: string, eventId: string) {
    const res = await fetch(`${API_URL}/events/${eventId}/export-csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendances-${eventId}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  },

  subscribeToQR(token: string, eventId: string, onMessage: (data: any) => void) {
    const eventSource = new EventSource(`${API_URL}/events/${eventId}/qr-stream?token=${token}`)
    
    eventSource.onmessage = (event) => {
      onMessage(JSON.parse(event.data))
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return eventSource
  },

  async generateToken(token: string, eventId: string) {
    const res = await fetch(`${API_URL}/events/${eventId}/generate-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}
