import { Routes, Route, useLocation, Navigate } from "react-router-dom"

import Avisos from "./pages/Avisos"
import Editor from "./pages/Editor"
import Preview from "./pages/Preview"
import Extra from "./pages/Extra"
import Dashboard from "./pages/Dashboard"
import LoginPage from "./pages/LoginPage"

import Navbar from "./components/layout/Navbar"
import { useState, useEffect } from "react"
import { checkAuthStatus } from "./utils/api"

// Componente para proteger rutas
function ProtectedRoute({ children }) {
  const [authStatus, setAuthStatus] = useState({ authorized: false, checking: true })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus()
        setAuthStatus({ ...status, checking: false })
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        setAuthStatus({ authorized: false, checking: false })
      }
    }

    checkAuth()
  }, [])

  if (authStatus.checking) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-loading">
            <div className="loading-spinner"></div>
            <p>Verificando sesión...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!authStatus.authorized) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  const location = useLocation()

  const isLoginRoute = location.pathname === "/login"
  const isDesignerRoute =
    location.pathname === "/" ||
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/avisos/")

  return (
    <div className="app-shell">
      {!isLoginRoute && <Navbar />}

      <div
        className={
          isDesignerRoute && !isLoginRoute
            ? "page-container page-container-fixed"
            : "page-container"
        }
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/avisos/:setId" element={
            <ProtectedRoute>
              <Avisos />
            </ProtectedRoute>
          } />

          <Route path="/avisos/:setId/preview" element={
            <ProtectedRoute>
              <Preview />
            </ProtectedRoute>
          } />

          <Route path="/editor/:id" element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          } />

          <Route path="/extra" element={
            <ProtectedRoute>
              <Extra />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  )
}