import { useAvisosStore } from "../../store/avisosStore"
import { useParams } from "react-router-dom"

export default function BlockPanel() {

  const { id } = useParams()

  const { avisos, setAvisos } = useAvisosStore()

  const agregarBloque = (tipo) => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(id))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    let nuevoBloque = { tipo }

    // ==========================
    // Estructura por tipo
    // ==========================

    if (tipo === "texto") {
      nuevoBloque.contenido = ""
    }

    if (tipo === "lista") {
      nuevoBloque.contenido = ["item"]
    }

    if (tipo === "tabla") {
      nuevoBloque.contenido = [["celda"]]
    }

    if (tipo === "link") {
      nuevoBloque.texto = "Abrir enlace"
      nuevoBloque.url = ""
    }

    if (tipo === "imagen") {
      nuevoBloque.url = ""
    }

    if (tipo === "chips") {
      nuevoBloque.items = ["persona"]
    }

    if (tipo === "info") {
      nuevoBloque.fecha = ""
      nuevoBloque.lugar = ""
      nuevoBloque.horario = ""
    }

    if (tipo === "banco") {
      nuevoBloque.banco = ""
      nuevoBloque.tipoCuenta = ""
      nuevoBloque.cuenta = ""
      nuevoBloque.titular = ""
      nuevoBloque.referencia = ""
    }

    nuevosAvisos[indexAviso].bloques.push(nuevoBloque)

    setAvisos(nuevosAvisos)

  }

  const bloques = [
    "texto",
    "lista",
    "tabla",
    "link",
    "imagen",
    "banco",
    "info",
    "chips"
  ]

  return (

    <div className="block-panel">

      <strong className="block-panel-title">Agregar bloque</strong>

      <div>

        {bloques.map((tipo) => (

          <div
            key={tipo}
            onClick={() => agregarBloque(tipo)}
            className="block-picker-item"
          >

            {tipo}

          </div>

        ))}

      </div>

    </div>

  )

}