import { Link } from "react-router-dom"
import { useAvisosStore } from "../../store/avisosStore"

export default function AvisoCard({ aviso, index }) {

  const { avisos, setAvisos } = useAvisosStore()

  const actualizar = (campo, valor) => {

    const nuevosAvisos = [...avisos]

    nuevosAvisos[index][campo] = valor

    setAvisos(nuevosAvisos)

  }

  const eliminarAviso = () => {

    const nuevosAvisos = [...avisos]

    nuevosAvisos.splice(index, 1)

    setAvisos(nuevosAvisos)

  }

  const moverArriba = () => {

    if (index === 0) return

    const nuevosAvisos = [...avisos]

    ;[nuevosAvisos[index - 1], nuevosAvisos[index]] =
    [nuevosAvisos[index], nuevosAvisos[index - 1]]

    setAvisos(nuevosAvisos)

  }

  const moverAbajo = () => {

    if (index === avisos.length - 1) return

    const nuevosAvisos = [...avisos]

    ;[nuevosAvisos[index + 1], nuevosAvisos[index]] =
    [nuevosAvisos[index], nuevosAvisos[index + 1]]

    setAvisos(nuevosAvisos)

  }

  return (

    <div
      style={{
        border: "1px solid #000",
        padding: "16px",
        marginBottom: "12px",
        borderRadius: "6px",
        background: "#fff"
      }}
    >

      <div style={{ marginBottom: "10px" }}>

        <strong>Título</strong>

        <input
          value={aviso.titulo || ""}
          onChange={(e) => actualizar("titulo", e.target.value)}
          style={{ width: "100%" }}
        />

      </div>

      <div style={{ marginBottom: "10px" }}>

        <strong>Categoría</strong>

        <select
          value={aviso.categoria || "extras"}
          onChange={(e) => actualizar("categoria", e.target.value)}
        >
          <option value="admin">admin</option>
          <option value="eventos">eventos</option>
          <option value="pastoral">pastoral</option>
          <option value="formacion">formacion</option>
          <option value="extras">extras</option>
        </select>

      </div>

      <p style={{ fontSize: "12px" }}>
        bloques: {aviso.bloques?.length || 0}
      </p>

      <div style={{ display: "flex", gap: "8px" }}>

        <button onClick={moverArriba}>↑</button>

        <button onClick={moverAbajo}>↓</button>

        <Link to={`/editor/${index}`}>
          Editar bloques
        </Link>

        <button
          onClick={eliminarAviso}
          style={{
            background: "#ff4444",
            color: "white",
            border: "none",
            padding: "4px 8px"
          }}
        >
          eliminar
        </button>

      </div>

    </div>

  )

}