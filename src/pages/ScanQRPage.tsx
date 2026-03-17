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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading event...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
        <button
          onClick={() => navigate('/events')}
          className="text-gray-600 hover:text-gray-800 mb-4 text-sm"
        >
          ← Back
        </button>

        {success ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Check-in Successful!
            </h2>
            <p className="text-gray-600">Your attendance has been recorded.</p>
            <p className="text-sm text-gray-500 mt-2">
              Redirecting to dashboard...
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {event.title}
            </h1>
            <p className="text-gray-600 mb-6">
              {event.venue} • {new Date(event.startTime).toLocaleString()}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 text-center mb-6">
              {qrData?.qrCode ? (
                <img
                  src={qrData.qrCode}
                  alt="QR Code"
                  className="w-64 h-64 mx-auto mb-4"
                />
              ) : (
                <div className="w-64 h-64 mx-auto bg-gray-200 rounded flex items-center justify-center">
                  <p className="text-gray-500">Loading QR...</p>
                </div>
              )}

              {qrData?.refreshAt && (
                <p className="text-xs text-gray-600">
                  QR refreshes in:{' '}
                  {Math.max(
                    0,
                    Math.floor((qrData.refreshAt - Date.now()) / 1000)
                  )}s
                </p>
              )}
            </div>

            <button
              onClick={handleScan}
              disabled={!qrData || scanning}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 mb-4"
            >
              {scanning ? 'Processing...' : '✓ Confirm Check-In'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Click the button above to confirm your attendance. This QR code is
              only valid for 30 seconds and refreshes automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
