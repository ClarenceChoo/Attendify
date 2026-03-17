import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api'

export const ScanQRPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState<any>(null)
  const [qrData, setQrData] = useState<any>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  const secondsLeft = qrData?.refreshAt
    ? Math.max(0, Math.floor((qrData.refreshAt - Date.now()) / 1000))
    : 0
  const refreshProgress = qrData?.refreshAt ? Math.min(100, (secondsLeft / 30) * 100) : 0

  useEffect(() => {
    if (!token || !eventId) return

    const loadEvent = async () => {
      try {
        const eventData = await apiClient.getEvent(token, eventId)
        setEvent(eventData)

        // Subscribe to QR stream
        const eventSource = apiClient.subscribeToQR(token, eventId, (data) => {
          setQrData(data)
        })

        return () => eventSource.close()
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [token, eventId])

  const handleScan = async () => {
    if (!qrData || !qrData.token || scanning) return

    setScanning(true)
    setError('')

    try {
      await apiClient.scan(token!, qrData.token, eventId!)
      setSuccess(true)
      setTimeout(() => {
        navigate('/events')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="surface-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-black" />
          <p className="text-sm text-slate-600">Loading check-in session...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/30 bg-white p-8 shadow-2xl">
        <button
          onClick={() => navigate('/events')}
          className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          ← Back
        </button>

        {success ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="mb-2 text-2xl font-bold text-neutral-900">
              Check-in Successful!
            </h2>
            <p className="text-slate-600">Your attendance has been recorded.</p>
            <p className="mt-2 text-sm text-slate-500">
              Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <div>
            <h1 className="mb-2 text-3xl font-bold text-slate-800">
              {event.title}
            </h1>
            <p className="mb-6 text-slate-600">
              {event.venue} • {new Date(event.startTime).toLocaleString()}
            </p>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-8 text-center">
              {qrData?.qrCode ? (
                <img
                  src={qrData.qrCode}
                  alt="QR Code"
                  className="mx-auto mb-4 h-64 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                />
              ) : (
                <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-xl bg-slate-200">
                  <p className="text-slate-500">Loading QR...</p>
                </div>
              )}

              {qrData?.refreshAt && (
                <div className="mx-auto mt-3 max-w-xs">
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span>QR refresh timer</span>
                    <span>{secondsLeft}s</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-neutral-900 transition-all"
                      style={{ width: `${refreshProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleScan}
              disabled={!qrData || scanning}
              className="btn-success mb-4 w-full py-3"
            >
              {scanning ? 'Processing...' : '✓ Confirm Check-In'}
            </button>

            <p className="text-center text-sm text-slate-600">
              Click the button above to confirm your attendance. This QR code is
              only valid for 30 seconds and refreshes automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
