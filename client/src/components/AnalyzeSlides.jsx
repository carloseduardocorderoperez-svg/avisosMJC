import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import apiUrl from "../utils/api";

function AnalyzeSlides({ onAnalysisComplete }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const analyzeSlides = async () => {
    try {
      setLoading(true);
      setMessage("Analizando slides con IA... Esto puede tomar unos minutos.");
      setResults([]);

      const response = await axios.post(apiUrl("/analyze-slides?persist=true"));

      const avisos = response.data.avisos || [];
      const nuevoSet = response.data.set;

      console.log(`Análisis completado: ${avisos.length} avisos encontrados`);

      setResults(avisos);
      setMessage(`¡Análisis completado! Se encontraron ${avisos.length} avisos.`);

      // Notificar al componente padre que el análisis se completó
      if (onAnalysisComplete) {
        onAnalysisComplete(nuevoSet);
      }

      // Redirigir al editor con el nuevo set después de 2 segundos
      setTimeout(() => {
        if (nuevoSet && nuevoSet.id) {
          navigate(`/avisos/${nuevoSet.id}`);
        }
      }, 2000);

    } catch (error) {
      console.error("Error analizando slides:", error);
      setMessage("Error analizando slides. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Analizar Slides con IA</h2>
      <p style={{ marginBottom: "20px", color: "#666" }}>
        Procesa las imágenes del PDF subido y extrae los avisos automáticamente
      </p>

      <button
        onClick={analyzeSlides}
        disabled={loading}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "20px"
        }}
      >
        {loading ? "Analizando..." : "Analizar Slides con IA"}
      </button>

      {message && (
        <div style={{
          margin: "20px 0",
          padding: "10px",
          backgroundColor: message.includes("Error") ? "#f8d7da" : "#d4edda",
          color: message.includes("Error") ? "#721c24" : "#155724",
          borderRadius: "5px",
          border: `1px solid ${message.includes("Error") ? "#f5c6cb" : "#c3e6cb"}`
        }}>
          {message}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: "30px", textAlign: "left", maxWidth: "800px", margin: "30px auto" }}>
          <h3>Resultado del Análisis:</h3>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            Se encontraron {results.length} avisos. Redirigiendo al editor...
          </p>

          {results.slice(0, 3).map((aviso, index) => (
            <div
              key={index}
              style={{
                background: "#f8f9fa",
                padding: "15px",
                marginBottom: "10px",
                borderRadius: "5px",
                border: "1px solid #dee2e6"
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "#495057" }}>
                {aviso.titulo || `Aviso ${index + 1}`}
              </h4>
              <p style={{ margin: "0", color: "#6c757d", fontSize: "14px" }}>
                <strong>Categoría:</strong> {aviso.categoria || "Sin categoría"}
              </p>
            </div>
          ))}

          {results.length > 3 && (
            <p style={{ color: "#6c757d", fontStyle: "italic" }}>
              ... y {results.length - 3} avisos más
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalyzeSlides;
