import { useState } from "react";
import axios from "axios";
import apiUrl from "../utils/api";

function PdfUploader({ onUploadSuccess }) {

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const uploadPdf = async () => {

    if (!file) {
      setMessage("Selecciona un PDF primero");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    try {

      setLoading(true);
      setMessage("Subiendo PDF y generando imágenes...");

      const response = await axios.post(
        apiUrl("/upload-pdf"),
        formData
      );

      setMessage(response.data.message);

      // Notificar al componente padre que la subida fue exitosa
      if (onUploadSuccess) {
        onUploadSuccess({
          filename: file.name,
          ...response.data
        });
      }

    } catch (error) {

      console.error(error);
      setMessage("Error al subir PDF");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div style={{ padding: "20px", textAlign: "center" }}>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={loading}
          style={{
            padding: "10px",
            border: "2px dashed #ccc",
            borderRadius: "5px",
            backgroundColor: "#f9f9f9",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        />
      </div>

      <button
        onClick={uploadPdf}
        disabled={loading}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "15px"
        }}
      >
        {loading ? "Procesando..." : "Subir y Procesar PDF"}
      </button>

      {loading && (
        <div style={{ marginTop: "15px", fontSize: "16px", color: "#666" }}>
          ⏳ Procesando PDF...
        </div>
      )}

      {message && (
        <p style={{
          marginTop: "10px",
          color: message.includes("Error") ? "#dc3545" : "#28a745",
          fontWeight: "bold"
        }}>
          {message}
        </p>
      )}

    </div>

  );

}

export default PdfUploader;