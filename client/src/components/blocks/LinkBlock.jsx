import { useAvisosStore } from "../../store/avisosStore"

export default function LinkBlock({ bloque, avisoId, bloqueIndex }) {

  const { avisos, setAvisos } = useAvisosStore()

  const actualizar = (campo, valor) => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    nuevosAvisos[indexAviso].bloques[bloqueIndex][campo] = valor

    setAvisos(nuevosAvisos)

  }

  return (

    <div className="block-body">

      <h4>Link / Botón</h4>

      <div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          Texto del botón
          <input
            className="modern-input"
            value={bloque.texto || ""}
            onChange={(e) => actualizar("texto", e.target.value)}
          />
        </div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          URL
          <input
            className="modern-input"
            value={bloque.url || ""}
            onChange={(e) => actualizar("url", e.target.value)}
          />
        </div>

      </div>

      <div style={{ marginTop: "10px" }}>

        <button className="canvas-link" type="button">
          <span className="canvas-link-edge" />
          <span className="canvas-link-front">
            {bloque.texto || "Botón"}
          </span>
        </button>

      </div>

    </div>

  )

}