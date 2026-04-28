import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { useAvisosStore } from "../store/avisosStore"
import { authenticatedRequest } from "../utils/api"
import DashboardSetCard from "../components/dashboard/DashboardSetCard"
import "../styles/dashboard.css"

export default function Dashboard() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(18)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState("")

  const navigate = useNavigate()
  const clearCurrentSet = useAvisosStore((s) => s.clearCurrentSet)

  // Función para formatear fechas de manera relativa
  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Hoy"
    if (diffDays === 1) return "Ayer"
    if (diffDays === 2) return "Hace dos días"
    if (diffDays < 7) return `Hace ${diffDays} días`
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return weeks === 1 ? "Hace una semana" : `Hace ${weeks} semanas`
    }
    const months = Math.floor(diffDays / 30)
    return months === 1 ? "Hace un mes" : `Hace ${months} meses`
  }

  // Función para parsear string de fecha dd/mm/aa o dd/mm/yyyy
  const parseDateString = (dateStr) => {
    if (!dateStr) return null
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])
      return new Date(year, month, day)
    }
    return null
  }

  // Al entrar al Dashboard limpiar el set activo para que la navbar no muestre breadcrumb
  useEffect(() => {
    clearCurrentSet()
  }, [clearCurrentSet])

  const cargarPagina = async (p = 1, append = false) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError("")

      const qParam = query && String(query).trim() ? `&q=${encodeURIComponent(String(query).trim())}` : ""
      const res = await authenticatedRequest(`/sets?page=${p}&pageSize=${pageSize}${qParam}`)
      const data = await res.json()
      const incoming = (data.sets || []).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

      setSets((prev) => (append ? [...prev, ...incoming] : incoming))
      setHasMore(Boolean(data.hasMore))
      setPage(p)
    } catch (err) {
      console.error(err)
      setError(err.message || "Error cargando dashboard")
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    cargarPagina(1, false)
  }, [])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => cargarPagina(1, false), 300)
    return () => clearTimeout(t)
  }, [query])

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return
    cargarPagina(page + 1, true)
  }

  const handleCrear = async () => {
    try {
      const res = await authenticatedRequest("/sets", {
        method: "POST",
        body: JSON.stringify({ code: "", date: "", title: "AVISOS ZONALES", avisos: [] }),
      })

      const nuevo = await res.json()
      setSets((prev) => [...prev, { ...nuevo, avisosCount: nuevo.avisos?.length || 0 }].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
      navigate(`/avisos/${nuevo.id}`)
    } catch (err) {
      console.error(err)
      setError(err.message || "Error creando grupo de avisos")
    }
  }

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar este grupo de avisos? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      await authenticatedRequest(`/sets/${id}`, {
        method: "DELETE",
      })

      setSets((prev) => prev.filter((s) => s.id !== id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
    } catch (err) {
      console.error(err)
      setError(err.message || "Error eliminando grupo de avisos")
    }
  }

  const handleDuplicar = async (id) => {
    try {
      const res = await authenticatedRequest(`/sets/${id}/duplicate`, {
        method: "POST",
      })

      const copia = await res.json()
      setSets((prev) => [...prev, { ...copia, avisosCount: copia.avisos?.length || 0 }].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
    } catch (err) {
      console.error(err)
      setError(err.message || "Error duplicando grupo de avisos")
    }
  }

  const handlePreview = (id) => {
    navigate(`/avisos/${id}/preview`)
  }

  const handleEditar = (id) => {
    navigate(`/avisos/${id}`)
  }

  const handleCopiarHtml = async (id) => {
    try {
      const res = await authenticatedRequest(`/sets/${id}/generar-html`, {
        method: "POST",
      })

      const data = await res.json()
      if (!data.archivo) throw new Error("Respuesta inválida del servidor")

      const htmlRes = await authenticatedRequest(`/output/${data.archivo}`)
      const htmlText = await htmlRes.text()

      await navigator.clipboard.writeText(htmlText)
      alert("HTML copiado al portapapeles")
    } catch (err) {
      console.error(err)
      alert("Error copiando HTML")
    }
  }

  const getSetLabel = (set) => {
    const parseToDate = (dateStr) => {
      if (!dateStr) return null
      if (dateStr instanceof Date) return dateStr
      if (typeof dateStr === 'string' && dateStr.includes('/')) {
        return parseDateString(dateStr)
      }
      const d = new Date(dateStr)
      return isNaN(d.getTime()) ? null : d
    }

    const formatSetLabelDate = (dateStr) => {
      const d = parseToDate(dateStr)
      if (!d) {
        if (typeof dateStr === 'string') return dateStr.replace(/\s+del\s+/i, ' de ')
        return 'Set sin fecha'
      }
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
    }

    if (set?.date) return formatSetLabelDate(set.date)
    if (set?.createdAt) return formatSetLabelDate(set.createdAt)
    return 'Set sin fecha'
  }

  const setsWithDisplayTitle = (() => {
    const titleCounts = {}
    return sets.map((set) => {
      const baseLabel = getSetLabel(set)
      const count = titleCounts[baseLabel] || 0
      titleCounts[baseLabel] = count + 1
      const displayTitle = count === 0 ? baseLabel : `${baseLabel} (${count})`
      return {
        ...set,
        displayTitle,
      }
    })
  })()

  return (
    <div className="page-card designer-page">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Sets de Avisos</h1>
          <p className="page-subtitle">Gestiona y organiza tus conjuntos de anuncios</p>

          <div className="dashboard-search-row">
            <input
              className="modern-input dashboard-search"
              placeholder="Buscar sets de avisos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <button className="btn btn-create" onClick={handleCrear}>
          <Plus size={14} /> Nuevo Set
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-grid-wrapper">
        {loading ? (
          <div className="dashboard-loading">Cargando grupos de avisos…</div>
        ) : sets.length === 0 ? (
          <div className="dashboard-empty">
            Aún no hay grupos de avisos. Crea uno nuevo para empezar.
          </div>
        ) : (
          <div className="dashboard-grid">
            {setsWithDisplayTitle.map((set) => (
              <DashboardSetCard
                key={set.id}
                set={set}
                displayTitle={set.displayTitle}
                onEdit={() => handleEditar(set.id)}
                onPreview={() => handlePreview(set.id)}
                onCopyHtml={() => handleCopiarHtml(set.id)}
                onDuplicate={() => handleDuplicar(set.id)}
                onDelete={() => handleEliminar(set.id)}
              />
            ))}
          </div>
        )}
      </div>
      {hasMore && (
        <div className="dashboard-load-more" style={{ marginTop: 14, textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}
    </div>
  )
}
