import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiClient } from '../api'
import { useAuth } from '../contexts/AuthContext'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverscroll = document.body.style.overscrollBehavior
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overscrollBehavior = previousBodyOverscroll
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { token, user } = await apiClient.login(email, password)
      login(token, user)

      // Check for pending QR scan from before login
      const pendingScan = localStorage.getItem('pendingScan')
      if (pendingScan) {
        const { signedToken, eventId } = JSON.parse(pendingScan)
        localStorage.removeItem('pendingScan')
        navigate(`/scan?token=${encodeURIComponent(signedToken)}&eventId=${encodeURIComponent(eventId)}`)
        return
      }

      navigate(user.role === 'organiser' ? '/organiser' : '/events')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-black via-stone-900 to-stone-800 p-4 md:p-8">
      <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-white/30 bg-white/10 shadow-2xl backdrop-blur md:grid-cols-2">
        <div className="hidden flex-col justify-between p-10 text-white md:flex">
          <div>
            <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
              HACKATHON READY
            </p>
            <h1 className="mt-6 text-5xl font-bold leading-tight">
              Attendify
            </h1>
            <p className="mt-4 max-w-md text-white/85">
              Secure participation tracking, live event operations, and engagement
              analytics for residential college life.
            </p>
          </div>
          <div className="space-y-3 text-sm text-white/90">
            <p>• Rotating signed QR tokens every 30 seconds</p>
            <p>• One-scan-per-user anti-proxy protection</p>
            <p>• Real-time organiser insights and exports</p>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white p-8 md:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 md:hidden">
              <h1 className="text-3xl font-bold text-slate-900">Attendify</h1>
              <p className="mt-2 text-sm text-slate-600">
                Smart Campus Engagement Platform
              </p>
            </div>

            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-600">
                Sign in with your NUS account to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  NUS Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@u.nus.edu"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-black focus:ring-4 focus:ring-stone-200"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Must use a valid NUS email (@u.nus.edu)
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-black focus:ring-4 focus:ring-stone-200"
                  required
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-stone-800 to-black px-4 py-3 font-semibold text-stone-100 shadow-md transition hover:from-stone-900 hover:to-black disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-600">
              Don't have an account? <Link to="/register" className="font-semibold text-slate-900">Create one</Link>
            </p>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="mb-2 font-semibold">Demo Accounts:</p>
              <ul className="space-y-1 text-xs">
            <li>
              <strong>Student:</strong> student1@u.nus.edu
            </li>
            <li>
              <strong>Organiser:</strong> org1@u.nus.edu
            </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
