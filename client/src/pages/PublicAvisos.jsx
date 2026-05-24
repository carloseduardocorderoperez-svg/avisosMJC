import { useState, useEffect, useRef } from "react";
import { apiUrl } from "../utils/api";
import { formatFullDate } from "../utils/dateUtils";
import { Link } from "react-router-dom";

export default function PublicAvisos() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wakeOverlay, setWakeOverlay] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const wakeTimer = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        // if the fetch takes longer than 800ms, show a "waking server" overlay
        wakeTimer.current = setTimeout(() => setWakeOverlay(true), 800);
        const res = await fetch(apiUrl('/public/sets'));
        if (!res.ok) throw new Error('Fetch error');
        const data = await res.json();
        setSets(data.sets || []);
      } catch (e) {
        console.error('Error loading public sets', e);
        setLoadError(e && e.message ? e.message : String(e));
        setWakeOverlay(true);
      } finally {
        if (wakeTimer.current) { clearTimeout(wakeTimer.current); wakeTimer.current = null; }
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="public-avisos page">
      <h1>Avisos Semanales Zona Omaha</h1>

      {loading && <p>Cargando...</p>}

      {wakeOverlay && (
        <div className="wake-overlay" style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.6)',zIndex:1200,color:'#fff',padding:20}}>
          <div style={{maxWidth:560,background:'#0f1113',padding:20,borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.6)',textAlign:'center'}}>
            <h3 style={{marginTop:0}}>Servidor en reposo — despertando</h3>
            <p style={{color:'#c7c9cc'}}>Parece que el servidor está inactivo por inactividad. Estamos intentando despertarlo; esto puede tardar unos segundos.</p>
            {loadError && <p style={{color:'#ffb4b4'}}>Error: {loadError}</p>}
            <div style={{marginTop:12,display:'flex',gap:8,justifyContent:'center'}}>
              <button className="btn btn-neutral" onClick={() => window.location.reload()}>Reintentar</button>
              <button className="btn btn-primary" onClick={() => window.open('https://zonaomaha-8a35a.web.app', '_blank', 'noopener')}>Abrir sitio (despertar)</button>
            </div>
          </div>
        </div>
      )}

      {!loading && sets.length === 0 && <p>No hay avisos publicados.</p>}

      <div className="public-sets-list">
        {sets.map((s) => (
          <div key={s.id} className="public-set-card">
            <div className="public-set-head">
              <div>
                <strong>{formatFullDate(s.date)}</strong>
                <div className="muted"></div>
              </div>
              <div className="public-set-meta">
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
