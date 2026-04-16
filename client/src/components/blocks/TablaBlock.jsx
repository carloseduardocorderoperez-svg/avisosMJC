import { useAvisosStore } from "../../store/avisosStore";

export default function TablaBlock({ bloque, avisoId, bloqueIndex }) {
  const { avisos, setAvisos } = useAvisosStore();

  const data = bloque.contenido || [];

  const encontrarAviso = () =>
    avisos.findIndex((a) => String(a.id) === String(avisoId));

  const actualizarCelda = (fila, columna, valor) => {
    const indexAviso = encontrarAviso();
    if (indexAviso === -1) return;

    const nuevosAvisos = [...avisos];
    const contenido =
      nuevosAvisos[indexAviso].bloques[bloqueIndex].contenido || [];

    if (!contenido[fila]) return;

    contenido[fila][columna] = valor;
    nuevosAvisos[indexAviso].bloques[bloqueIndex].contenido = contenido;
    setAvisos(nuevosAvisos);
  };

  const agregarFila = () => {
    const indexAviso = encontrarAviso();
    if (indexAviso === -1) return;

    const nuevosAvisos = [...avisos];
    const bloqueTabla = nuevosAvisos[indexAviso].bloques[bloqueIndex];
    const contenidoActual = bloqueTabla.contenido || [];

    const columnas =
      (Array.isArray(contenidoActual[0]) && contenidoActual[0].length) || 1;

    const nuevaFila = new Array(columnas).fill("celda");

    if (!Array.isArray(contenidoActual) || contenidoActual.length === 0) {
      bloqueTabla.contenido = [nuevaFila];
    } else {
      bloqueTabla.contenido = [...contenidoActual, nuevaFila];
    }

    setAvisos(nuevosAvisos);
  };

  const agregarColumna = () => {
    const indexAviso = encontrarAviso();
    if (indexAviso === -1) return;

    const nuevosAvisos = [...avisos];
    const bloqueTabla = nuevosAvisos[indexAviso].bloques[bloqueIndex];
    const contenidoActual = bloqueTabla.contenido || [];

    if (!Array.isArray(contenidoActual) || contenidoActual.length === 0) {
      // Si la tabla estaba vacía, creamos la primera fila/columna
      bloqueTabla.contenido = [["celda"]];
    } else {
      bloqueTabla.contenido = contenidoActual.map((fila) => [
        ...fila,
        "celda",
      ]);
    }

    setAvisos(nuevosAvisos);
  };

  const eliminarFila = (fila) => {
    const indexAviso = encontrarAviso();
    if (indexAviso === -1) return;

    const nuevosAvisos = [...avisos];
    const bloqueTabla = nuevosAvisos[indexAviso].bloques[bloqueIndex];
    const contenidoActual = bloqueTabla.contenido || [];

    if (!Array.isArray(contenidoActual) || contenidoActual.length === 0) return;

    const nuevoContenido = [...contenidoActual];
    nuevoContenido.splice(fila, 1);
    bloqueTabla.contenido = nuevoContenido;

    setAvisos(nuevosAvisos);
  };

  return (
    <div className="block-body">
      <h4>Tabla</h4>
      <div className="inline-row">
        <button
          className="btn btn-neutral small-btn"
          type="button"
          onClick={agregarFila}
        >
          + fila
        </button>
        <button
          className="btn btn-neutral small-btn"
          type="button"
          onClick={agregarColumna}
        >
          + columna
        </button>
      </div>

      {data.length === 0 ? (
        <div className="empty-state small">
          Tabla vacía. Usa los botones para agregar filas o columnas.
        </div>
      ) : (
        <table className="table-editor">
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>
                    <input
                      className="modern-input"
                      value={cell}
                      onChange={(e) =>
                        actualizarCelda(i, j, e.target.value)
                      }
                    />
                  </td>
                ))}

                <td>
                  <button
                    className="btn btn-danger small-btn"
                    type="button"
                    onClick={() => eliminarFila(i)}
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}