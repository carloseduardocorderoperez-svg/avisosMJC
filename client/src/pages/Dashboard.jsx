import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { useAvisosStore } from "../store/avisosStore"
import { authenticatedRequest } from "../utils/api"
import DashboardSetCard from "../components/dashboard/DashboardSetCard"
import { formatFullDate } from "../utils/dateUtils"
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

  // Función para parsear string de fecha dd/mm/aa o dd/mm/yyyy
  const parseDateString = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null

    const parts = dateStr.split("/")

    if (parts.length === 3) {
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year =
        parts[2].length === 2
          ? 2000 + parseInt(parts[2], 10)
          : parseInt(parts[2], 10)

      return new Date(year, month, day)
    }

    return null
  }

  // Obtener fecha válida para ordenar
  const getSortableDate = (set) => {
    return (
      parseDateString(set?.date) ||
      new Date(set?.createdAt || 0)
    )
  }

  // Ordenar sets
  const sortSetsByDate = (setsArray) => {
    return [...setsArray].sort(
      (a, b) => getSortableDate(b) - getSortableDate(a)
    )
  }

  // Al entrar al Dashboard limpiar el set activo
  useEffect(() => {
    clearCurrentSet()
  }, [clearCurrentSet])

  const cargarPagina = async (p = 1, append = false) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)

      setError("")

      const qParam =
        query && String(query).trim()
          ? `&q=${encodeURIComponent(String(query).trim())}`
          : ""

      const res = await authenticatedRequest(
        `/sets?page=${p}&pageSize=${pageSize}${qParam}`
      )

      const data = await res.json()

      const incoming = sortSetsByDate(data.sets || [])

      setSets((prev) =>
        append
          ? sortSetsByDate([...prev, ...incoming])
          : incoming
      )

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
    const t = setTimeout(() => {
      cargarPagina(1, false)
    }, 300)

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
        body: JSON.stringify({
          code: "",
          date: "",
          title: "AVISOS ZONALES",
          avisos: [],
        }),
      })

      const nuevo = await res.json()

      setSets((prev) =>
        sortSetsByDate([
          ...prev,
          {
            ...nuevo,
            avisosCount: nuevo.avisos?.length || 0,
          },
        ])
      )

      navigate(`/avisos/${nuevo.id}`)
    } catch (err) {
      console.error(err)
      setError(err.message || "Error creando grupo de avisos")
    }
  }

  const handleEliminar = async (id) => {
    if (
      !window.confirm(
        "¿Eliminar este grupo de avisos? Esta acción no se puede deshacer."
      )
    ) {
      return
    }

    try {
      await authenticatedRequest(`/sets/${id}`, {
        method: "DELETE",
      })

      setSets((prev) =>
        sortSetsByDate(prev.filter((s) => s.id !== id))
      )
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

      setSets((prev) =>
        sortSetsByDate([
          ...prev,
          {
            ...copia,
            avisosCount: copia.avisos?.length || 0,
          },
        ])
      )
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

      if (!data.archivo) {
        throw new Error("Respuesta inválida del servidor")
      }

      const htmlRes = await authenticatedRequest(
        `/output/${data.archivo}`
      )

      const htmlText = await htmlRes.text()

      await navigator.clipboard.writeText(htmlText)

      alert("HTML copiado al portapapeles")
    } catch (err) {
      console.error(err)
      alert("Error copiando HTML")
    }
  }

  const getSetLabel = (set) => {
    if (set?.date) return formatFullDate(set.date, { includeYear: false })
    if (set?.createdAt) return formatFullDate(set.createdAt, { includeYear: false })
    return "Set sin fecha"
  }

  const setsWithDisplayTitle = (() => {
    const titleCounts = {}

    return sets.map((set) => {
      const baseLabel = getSetLabel(set)

      const count = titleCounts[baseLabel] || 0

      titleCounts[baseLabel] = count + 1

      const displayTitle =
        count === 0
          ? baseLabel
          : `${baseLabel} (${count})`

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
          <h1 className="page-title">Dashboard</h1>

          <p className="page-subtitle">
            Página de administración de avisos zonales
          </p>

          <div className="dashboard-search-row">
            <input
              className="modern-input dashboard-search"
              placeholder="Buscar avisos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <button className="btn btn-create" onClick={handleCrear}>
          <Plus size={14} />
          Nuevo Set
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-grid-wrapper">
        {loading ? (
          <div className="dashboard-loading">
            Cargando grupos de avisos…
          </div>
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
                onPublish={(updatedSet) =>
                  setSets((prev) =>
                    sortSetsByDate(
                      prev.map((s) =>
                        s.id === updatedSet.id
                          ? { ...s, ...updatedSet }
                          : s
                      )
                    )
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <div
          className="dashboard-load-more"
          style={{
            marginTop: 14,
            textAlign: "center",
          }}
        >
          <button
            className="btn btn-primary"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}
    </div>
  )
}