import { useState } from "react";
import axios from "axios";

function PdfUploader() {

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
        "http://localhost:3000/upload-pdf",
        formData
      );

      setMessage(response.data.message);

    } catch (error) {

      console.error(error);
      setMessage("Error al subir PDF");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div style={{ padding: "40px", textAlign: "center" }}>

      <h2>Subir PDF de Avisos</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={loading}
      />

      <br />
      <br />

      <button
        onClick={uploadPdf}
        disabled={loading}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Procesando..." : "Procesar PDF"}
      </button>

      {loading && (
        <div style={{ marginTop: "20px", fontSize: "18px" }}>
          ⏳ Procesando PDF...
        </div>
      )}

      <p style={{ marginTop: "10px" }}>{message}</p>

    </div>

  );

}

export default PdfUploader;