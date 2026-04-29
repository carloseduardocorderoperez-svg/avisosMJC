import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiUrl } from "../utils/api";

export default function PublicAvisoView() {
  const { slug } = useParams();
  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/public/sets/${slug}?format=html`));
        if (!res.ok) throw new Error('No encontrado');
        const text = await res.text();
        setHtml(text);
      } catch (e) {
        console.error('Error cargando aviso público', e);
        setHtml('<p>No se pudo cargar el aviso.</p>');
      } finally {
        setLoading(false);
      }
    };

    if (slug) load();
  }, [slug]);

  return (
    <div className="public-aviso-view page">
      {loading && <p>Cargando...</p>}

      {!loading && (
        <div className="public-aviso-content" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}
