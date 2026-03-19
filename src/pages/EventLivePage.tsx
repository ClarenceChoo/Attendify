import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api'

export const EventLivePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const { token } = useAuth()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [intervalId, setIntervalId] = useState<number | null>(null)

  useEffect(() => {
    if (!token || !eventId) return

    let currentObjectUrl: string | null = null

    const generate = async () => {
      try {
        const resp = await apiClient.generateToken(token!, eventId!)

        // prefer server-provided QR data URL
        if (resp.qrDataUrl) {
          // revoke previous blob url if any
          if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl)
            currentObjectUrl = null
          }
          setQrUrl(resp.qrDataUrl)
        } else if (resp.scanUrl) {
          // fallback: fetch external QR image and create object URL
          try {
            const r = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(resp.scanUrl)}`)
            const blob = await r.blob()
            if (currentObjectUrl) {
              URL.revokeObjectURL(currentObjectUrl)
            }
            currentObjectUrl = URL.createObjectURL(blob)
            setQrUrl(currentObjectUrl)
          } catch (err) {
            console.error('Failed to create QR image', err)
            setQrUrl(resp.scanUrl) // as last resort
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate token')
      } finally {
        setLoading(false)
      }
    }

    // generate immediately and then every 20s to match token expiry
    generate()
    const id = window.setInterval(generate, 20000)
    setIntervalId(id)

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (id) clearInterval(id)
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
    }
  }, [token, eventId])

  if (loading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6">Error: {error}</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Live QR</h1>
      {qrUrl ? (
        <div>
          {/* qrUrl may be a data URL or an object URL for an image */}
          <img src={qrUrl} alt="Live QR" width={256} height={256} />
          <p className="mt-2 text-sm text-slate-600">This QR refreshes automatically every 20 seconds.</p>
        </div>
      ) : (
        <p>No QR available</p>
      )}
    </div>
  )
}

export default EventLivePage
