import React, { createContext, useContext, useState } from 'react'

interface User {
  id: string
  email: string
  name: string
  role?: string
}

interface AuthContextType {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
  isOrganiser: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token')
  )
  const [user, setUser] = useState<User | null>(
    () => {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    }
  )

  const login = (token: string, user: User) => {
    setToken(token)
    setUser(user)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isOrganiser: user?.role === 'organiser',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
