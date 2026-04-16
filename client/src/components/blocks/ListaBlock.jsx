import { useAvisosStore } from "../../store/avisosStore"

export default function ListaBlock({ bloque, avisoId, bloqueIndex }) {

  const { avisos, setAvisos } = useAvisosStore()

  const items = bloque.contenido || []

  const actualizar = (index, valor) => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    nuevosAvisos[indexAviso].bloques[bloqueIndex].contenido[index] = valor

    setAvisos(nuevosAvisos)

  }

  const agregarItem = () => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    nuevosAvisos[indexAviso].bloques[bloqueIndex].contenido.push("item")

    setAvisos(nuevosAvisos)

  }

  const eliminarItem = (index) => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    nuevosAvisos[indexAviso].bloques[bloqueIndex].contenido.splice(index, 1)

    setAvisos(nuevosAvisos)

  }

  return (

    <div className="block-body">

      <h4>Lista</h4>

      <div>

        {items.map((item, index) => (

          <div key={index} className="inline-row">

            <input
              className="modern-input"
              value={item}
              onChange={(e) => actualizar(index, e.target.value)}
            />

            <button
              className="btn btn-danger small-btn"
              onClick={() => eliminarItem(index)}
            >
              x
            </button>

          </div>

        ))}

      </div>

      <button
        className="btn btn-neutral small-btn"
        onClick={agregarItem}
      >
        + agregar item
      </button>

    </div>

  )

}