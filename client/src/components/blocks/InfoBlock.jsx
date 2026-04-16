import { useAvisosStore } from "../../store/avisosStore"

export default function InfoBlock({ bloque, avisoId, bloqueIndex }) {

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

      <h4>Información del evento</h4>

      <div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          📅 Fecha
          <input
            className="modern-input"
            value={bloque.fecha || ""}
            onChange={(e) => actualizar("fecha", e.target.value)}
          />
        </div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          📍 Lugar
          <input
            className="modern-input"
            value={bloque.lugar || ""}
            onChange={(e) => actualizar("lugar", e.target.value)}
          />
        </div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          🕒 Horario
          <input
            className="modern-input"
            value={bloque.horario || ""}
            onChange={(e) => actualizar("horario", e.target.value)}
          />
        </div>

      </div>

    </div>

  )

}