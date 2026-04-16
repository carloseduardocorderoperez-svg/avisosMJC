import { useEffect, useState } from "react";
import axios from "axios";

function AvisoCards({ onSelect }) {

  const [avisos, setAvisos] = useState([]);

  useEffect(() => {

    async function fetchAvisos() {

      try {

        const res = await axios.get("http://localhost:3000/avisos");

        setAvisos(res.data.avisos);

      } catch (error) {

        console.error("Error cargando avisos:", error);

      }

    }

    fetchAvisos();

  }, []);

  return (

    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
      gap: "20px",
      padding: "20px"
    }}>

      {avisos.map((aviso, index) => (

        <div
          key={index}
          onClick={() => onSelect(aviso)}
          style={{
            background: "#1e1e1e",
            borderRadius: "10px",
            padding: "20px",
            cursor: "pointer",
            border: "1px solid #333"
          }}
        >

          <h3>{aviso.titulo}</h3>

          <p style={{ opacity: 0.7 }}>
            {aviso.categoria}
          </p>

          <p style={{ fontSize: "12px", opacity: 0.6 }}>
            Slides: {aviso.slides.join(", ")}
          </p>

        </div>

      ))}

    </div>

  );

}

export default AvisoCards;