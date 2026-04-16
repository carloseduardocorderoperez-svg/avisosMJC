import { useAvisosStore } from "../../store/avisosStore"

export default function TextoBlock({ bloque, avisoId, bloqueIndex }) {

  const { avisos, setAvisos } = useAvisosStore()

  const handleChange = (e) => {

    const indexAviso = avisos.findIndex((a) => String(a.id) === String(avisoId))

    if (indexAviso === -1) return

    const nuevosAvisos = [...avisos]

    nuevosAvisos[indexAviso].bloques[bloqueIndex].contenido = e.target.value

    setAvisos(nuevosAvisos)

  }

  return (

    <div className="block-body">

      <h4>Texto</h4>

      <textarea
        className="modern-textarea"
        value={bloque.contenido || ""}
        onChange={handleChange}
      />

    </div>

  )

}