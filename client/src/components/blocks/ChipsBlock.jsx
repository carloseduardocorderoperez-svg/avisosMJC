import { useAvisosStore } from "../../store/avisosStore"

export default function ChipsBlock({ bloque, avisoId, bloqueIndex }) {

  const { avisos, setAvisos } = useAvisosStore()

  const items = bloque.items || []

  const actualizar = (index, valor) => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    nuevosAvisos[indexAviso].bloques[bloqueIndex].items[index] = valor

    setAvisos(nuevosAvisos)

  }

  const agregarChip = () => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    nuevosAvisos[indexAviso].bloques[bloqueIndex].items.push("persona")

    setAvisos(nuevosAvisos)

  }

  const eliminarChip = (index) => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    nuevosAvisos[indexAviso].bloques[bloqueIndex].items.splice(index, 1)

    setAvisos(nuevosAvisos)

  }

  return (

    <div className="block-body">

      <h4>Encargados</h4>

      <div
        style={{
          marginTop: "8px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap"
        }}
      >

        {items.map((item, index) => (

          <div key={index} className="inline-row">

            <input
              className="modern-input"
              value={item}
              onChange={(e) => actualizar(index, e.target.value)}
            />

            <button
              className="btn btn-danger small-btn"
              onClick={() => eliminarChip(index)}
            >
              x
            </button>

          </div>

        ))}

      </div>

      <button
        className="btn btn-neutral small-btn"
        onClick={agregarChip}
      >
        + agregar
      </button>

    </div>

  )

}