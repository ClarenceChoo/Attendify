import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api'

export const ScanQRPage: React.FC = () => {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const signedToken = params.get('token')
    const eventId = params.get('eventId')

    if (!signedToken) {
      setError('No scan token provided')
      return
    }

    // If user not authenticated, save pending scan and redirect to login
    if (!token) {
      const pending = JSON.stringify({ signedToken, eventId })
      localStorage.setItem('pendingScan', pending)
      // redirect to login - LoginPage will detect pendingScan and redirect back
      navigate('/login')
      return
    }

    // If authenticated, immediately attempt scan
    const doScan = async () => {
      setProcessing(true)
      setError('')
      try {
        await apiClient.scan(token!, signedToken, eventId || '')
        setSuccess(true)
        // clear any pending scan
        localStorage.removeItem('pendingScan')
        setTimeout(() => navigate('/events'), 1500)
      } catch (err: any) {
        setError(err.message || 'Scan failed')
      } finally {
        setProcessing(false)
      }
    }

    doScan()
  }, [token, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/30 bg-white p-8 shadow-2xl text-center">
        {success ? (
          <div>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="mb-2 text-2xl font-bold text-neutral-900">Check-in Successful!</h2>
            <p className="text-slate-600">Your attendance has been recorded. Redirecting...</p>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold mb-2 text-slate-800">Scan Processing</h1>
            {processing ? (
              <p className="text-sm text-slate-600">Validating token and recording attendance...</p>
            ) : (
              <p className="text-sm text-slate-600">{error || 'Ready to process scan'}</p>
            )}
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
            )}
            <div className="mt-6">
              <button onClick={() => navigate('/events')} className="text-sm font-semibold text-slate-700">Back to events</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
