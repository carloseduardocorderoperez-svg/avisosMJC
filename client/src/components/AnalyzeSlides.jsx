import { useState } from "react";
import axios from "axios";
import apiUrl from "../utils/api";

function AnalyzeSlides() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const analyzeSlides = async () => {
    try {
      setLoading(true);

      const response = await axios.post(apiUrl("/analyze-slides"));

      setResults(response.data.avisos);
    } catch (error) {
      console.error(error);

      alert("Error analizando slides");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Analizar Slides con IA</h2>

      <button onClick={analyzeSlides} disabled={loading}>
        {loading ? "Analizando..." : "Analizar Slides"}
      </button>

      <div style={{ marginTop: "30px", textAlign: "left" }}>
        {results.map((aviso, index) => (
          <div
            key={index}
            style={{
              background: "#eee",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "5px",
            }}
          >
            <h3>{aviso.titulo}</h3>

            <p>
              <strong>Categoría:</strong> {aviso.categoria}
            </p>

            <p>
              <strong>Slides:</strong> {aviso.slides.join(", ")}
            </p>

            <pre style={{ whiteSpace: "pre-wrap" }}>
              {aviso.contenido.join("\n\n")}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnalyzeSlides;
