import { useAvisosStore } from "../../store/avisosStore"

export default function BancoBlock({ bloque, avisoId, bloqueIndex }) {

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

      <h4>Datos Bancarios</h4>

      <div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          Banco
          <input
            className="modern-input"
            value={bloque.banco || ""}
            onChange={(e) => actualizar("banco", e.target.value)}
          />
        </div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          Tipo de cuenta
          <input
            className="modern-input"
            value={bloque.tipoCuenta || ""}
            onChange={(e) => actualizar("tipoCuenta", e.target.value)}
          />
        </div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          Cuenta
          <input
            className="modern-input"
            value={bloque.cuenta || ""}
            onChange={(e) => actualizar("cuenta", e.target.value)}
          />
        </div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          Titular
          <input
            className="modern-input"
            value={bloque.titular || ""}
            onChange={(e) => actualizar("titular", e.target.value)}
          />
        </div>

        <div className="inline-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          Referencia
          <input
            className="modern-input"
            value={bloque.referencia || ""}
            onChange={(e) => actualizar("referencia", e.target.value)}
          />
        </div>

      </div>

    </div>

  )

}