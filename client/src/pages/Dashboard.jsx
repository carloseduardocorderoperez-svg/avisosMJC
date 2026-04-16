import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, Eye, Clipboard, Copy, Trash2 } from "lucide-react"
import { useAvisosStore } from "../store/avisosStore"

export default function Dashboard() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const navigate = useNavigate()
  const clearCurrentSet = useAvisosStore((s) => s.clearCurrentSet)

  // Al entrar al Dashboard limpiar el set activo para que la navbar no muestre breadcrumb
  useEffect(() => {
    clearCurrentSet()
  }, [clearCurrentSet])

  const cargarSets = async () => {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("http://localhost:3000/sets")
      if (!res.ok) throw new Error("No se pudieron cargar los grupos de avisos")

      const data = await res.json()
      setSets(data.sets || [])
    } catch (err) {
      console.error(err)
      setError(err.message || "Error cargando dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarSets()
  }, [])

  const handleCrear = async () => {
    try {
      const res = await fetch("http://localhost:3000/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "", date: "", title: "AVISOS ZONALES", avisos: [] }),
      })

      if (!res.ok) throw new Error("No se pudo crear el grupo de avisos")

      const nuevo = await res.json()
      setSets((prev) => [...prev, { ...nuevo, avisosCount: nuevo.avisos?.length || 0 }])
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
      const res = await fetch(`http://localhost:3000/sets/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("No se pudo eliminar el grupo de avisos")

      setSets((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error(err)
      setError(err.message || "Error eliminando grupo de avisos")
    }
  }

  const handleDuplicar = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/sets/${id}/duplicate`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("No se pudo duplicar el grupo de avisos")

      const copia = await res.json()
      setSets((prev) => [...prev, { ...copia, avisosCount: copia.avisos?.length || 0 }])
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
      const res = await fetch(`http://localhost:3000/sets/${id}/generar-html`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("No se pudo generar el HTML")

      const data = await res.json()
      if (!data.archivo) throw new Error("Respuesta inválida del servidor")

      const htmlRes = await fetch(`http://localhost:3000/output/${data.archivo}`)
      const htmlText = await htmlRes.text()

      await navigator.clipboard.writeText(htmlText)
      alert("HTML copiado al portapapeles")
    } catch (err) {
      console.error(err)
      alert("Error copiando HTML")
    }
  }

  const handleFechaChange = async (id, nuevaFecha) => {
    try {
      const res = await fetch(`http://localhost:3000/sets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: nuevaFecha }),
      })

      if (!res.ok) throw new Error("No se pudo actualizar la fecha")

      const updated = await res.json()
      setSets((prev) =>
        prev.map((s) => (s.id === id ? { ...s, date: updated.date } : s)),
      )
    } catch (err) {
      console.error(err)
      setError(err.message || "Error actualizando fecha")
    }
  }

  return (
    <div className="page-card designer-page">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Gestiona tus grupos de avisos: crea nuevos, edita, duplica, elimina,
            copia el HTML completo o abre la vista previa.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCrear}>
          <Plus size={14} /> Crear nuevo grupo de avisos
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Cantidad de avisos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  Cargando grupos de avisos…
                </td>
              </tr>
            ) : sets.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  Aún no hay grupos de avisos. Crea uno nuevo para empezar.
                </td>
              </tr>
            ) : (
              sets.map((set) => (
                <tr key={set.id}>
                  <td>{set.code || set.id}</td>
                  <td>
                    <input
                      type="text"
                      className="dashboard-date-input"
                      value={set.date || ""}
                      placeholder="dd/mm/aa"
                      onChange={(e) =>
                        handleFechaChange(set.id, e.target.value)
                      }
                    />
                  </td>
                  <td>{set.avisosCount ?? 0}</td>
                  <td className="dashboard-actions-cell">
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => handleEditar(set.id)}
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      className="btn btn-small btn-neutral"
                      onClick={() => handlePreview(set.id)}
                    >
                      <Eye size={13} /> Vista previa
                    </button>
                    <button
                      className="btn btn-small btn-neutral"
                      onClick={() => handleCopiarHtml(set.id)}
                    >
                      <Clipboard size={13} /> Copiar HTML
                    </button>
                    <button
                      className="btn btn-small btn-neutral"
                      onClick={() => handleDuplicar(set.id)}
                    >
                      <Copy size={13} /> Duplicar
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleEliminar(set.id)}
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
