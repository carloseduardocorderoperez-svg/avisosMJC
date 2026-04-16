import { useState } from "react";

function AvisoEditor({ aviso }) {

  const [bloques, setBloques] = useState(() => aviso?.bloques || []);

  if (!aviso) {
    return null;
  }

  return (

    <div style={{ padding: "40px", color: "#fff" }}>

      <h2>{aviso.titulo}</h2>

      <p style={{ opacity: 0.6 }}>
        Categoría: {aviso.categoria || "Sin categoría"}
      </p>

      {bloques.map((bloque, index) => (

        <div
          key={index}
          style={{
            background: "#222",
            padding: "15px",
            marginBottom: "12px",
            borderRadius: "8px",
            border: "1px solid #333"
          }}
        >

          <strong style={{ textTransform: "uppercase", fontSize: "12px", opacity: 0.7 }}>
            {bloque.tipo}
          </strong>

          {/* TEXTO */}

          {bloque.tipo === "texto" && (
            <p style={{ marginTop: "10px" }}>
              {bloque.contenido}
            </p>
          )}

          {/* LISTA */}

          {bloque.tipo === "lista" && (
            <ul style={{ marginTop: "10px" }}>
              {bloque.items?.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}

          {/* LINK */}

          {bloque.tipo === "link" && (
            <div style={{ marginTop: "10px" }}>
              <a
                href={bloque.url || "#"}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#4da3ff",
                  textDecoration: "none",
                  fontWeight: "bold"
                }}
              >
                {bloque.texto || "Abrir enlace"}
              </a>
            </div>
          )}

          {/* TABLA */}

          {bloque.tipo === "tabla" && (
            <div style={{ marginTop: "10px", overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: "13px"
                }}
              >
                <tbody>
                  {bloque.filas?.map((fila, i) => (
                    <tr key={i}>
                      {fila.map((celda, j) => (
                        <td
                          key={j}
                          style={{
                            border: "1px solid #444",
                            padding: "6px"
                          }}
                        >
                          {celda}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      ))}

      <button
        onClick={() =>
          setBloques([
            ...bloques,
            { tipo: "texto", contenido: "Nuevo bloque" }
          ])
        }
        style={{
          marginTop: "20px",
          padding: "10px 16px",
          background: "#8b4513",
          border: "none",
          color: "#fff",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold"
        }}
      >
        + agregar bloque
      </button>

    </div>

  );

}

export default AvisoEditor;