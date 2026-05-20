import { useState, useEffect } from "react";
import { apiUrl } from "../utils/api";
import { formatFullDate } from "../utils/dateUtils";
import { Link } from "react-router-dom";

export default function PublicAvisos() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/public/sets'));
        if (!res.ok) throw new Error('Fetch error');
        const data = await res.json();
        setSets(data.sets || []);
      } catch (e) {
        console.error('Error loading public sets', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="public-avisos page">
      <h1>Avisos públicos</h1>

      {loading && <p>Cargando...</p>}

      {!loading && sets.length === 0 && <p>No hay avisos publicados.</p>}

      <div className="public-sets-list">
        {sets.map((s) => (
          <div key={s.id} className="public-set-card">
            <div className="public-set-head">
              <div>
                <strong>{s.title}</strong>
                <div className="muted">{formatFullDate(s.date)}</div>
              </div>
              <div className="public-set-meta">
                <span className="badge">Publicado</span>
                <Link to={`/avisos-semanales/${s.publicSlug || s.code.toLowerCase()}`} className="btn btn-primary small-btn">Ver</Link>
              </div>
            </div>
            <div className="public-set-count">{s.avisosCount} avisos</div>
          </div>
        ))}
      </div>
    </div>
  );
}
