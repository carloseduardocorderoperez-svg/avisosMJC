import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogIn, Shield } from "lucide-react"
import { checkAuthStatus, loginWithGoogle } from "../utils/api"

export default function LoginPage() {
  const [isChecking, setIsChecking] = useState(true)
  const [authStatus, setAuthStatus] = useState({ authorized: false })
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus()
        setAuthStatus(status)

        if (status.authorized) {
          // Usuario ya autenticado, redirigir al dashboard
          navigate("/dashboard")
          return
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [navigate])

  const handleLogin = () => {
    loginWithGoogle()
  }

  if (isChecking) {
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

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <Shield size={48} />
          <h1>Avisos Omaha</h1>
          <p>Sistema de gestión de avisos</p>
        </div>

        <div className="login-content">
          <div className="login-card">
            <h2>Acceso restringido</h2>
            <p>
              Esta aplicación requiere autenticación para garantizar la seguridad
              y privacidad de los datos.
            </p>

            <div className="login-info">
              <p><strong>Acceso autorizado solo para</strong></p>
              <p className="allowed-email">Zona Omaha (ECZ)</p>
            </div>

            <button
              className="btn btn-primary login-btn"
              onClick={handleLogin}
            >
              <LogIn size={18} />
              Iniciar sesión en Google como Zona Omaha
            </button>

            <p className="login-note">
              Se abrirá una ventana de Google para completar la autenticación.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}