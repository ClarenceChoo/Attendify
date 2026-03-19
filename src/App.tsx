import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { StudentDashboard } from './pages/StudentDashboard'
import { ScanQRPage } from './pages/ScanQRPage'
import { OrganiserDashboard } from './pages/OrganiserDashboard'
import { EventManagementPage } from './pages/EventManagementPage'
import EventLivePage from './pages/EventLivePage'
import './App.css'

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

const AppRoutes = () => {
  const { isAuthenticated, isOrganiser } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/event/:eventId/live" element={<EventLivePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={isOrganiser ? '/organiser' : '/events'} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/events"
        element={
          <PrivateRoute>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/events/:eventId"
        element={
          <PrivateRoute>
            <ScanQRPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/organiser"
        element={
          <PrivateRoute>
            <OrganiserDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/organiser/events/:eventId"
        element={
          <PrivateRoute>
            <EventManagementPage />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
