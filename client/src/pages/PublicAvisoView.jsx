import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiUrl } from "../utils/api";
import { formatFullDate } from "../utils/dateUtils";

export default function PublicAvisoView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(slug || null);
  const [showControls, setShowControls] = useState(false);
  const iframeRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    const loadList = async () => {
      try {
        const res = await fetch(apiUrl('/public/sets'));
        if (!res.ok) throw new Error('Fetch error');
        const data = await res.json();
        setSets(data.sets || []);
      } catch (e) {
        console.error('Error loading public sets', e);
      }
    };

    loadList();
  }, []);

  useEffect(() => {
    if (slug) setCurrentSlug(slug);
  }, [slug]);

  const handleSelect = (s) => {
    const next = s.publicSlug || s.code || s.id;
    navigate(`/avisos-semanales/${next}`);
    setCurrentSlug(next);
    setSidebarOpen(false);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const iframeSrc = currentSlug ? apiUrl(`/public/sets/${currentSlug}?format=html`) : '';
  const currentSet = sets.find(s => (s.publicSlug || s.code) === currentSlug) || {};
  const headerDate = currentSet?.date || currentSet?.createdAt || null;
  const headerLabel = headerDate ? formatFullDate(headerDate, { includeYear: true }) : (currentSet?.title || '');

  return (
    <div className="public-view-fullscreen" onMouseMove={handleMouseMove} onTouchMove={handleMouseMove}>
      {/* Sidebar desplegable */}
      <aside className={`public-sidebar-fullscreen ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header-fullscreen">
          <h2>Avisos publicados</h2>
          <button className="sidebar-close-fullscreen" onClick={() => setSidebarOpen(false)} title="Cerrar">✕</button>
        </div>
        <nav className="sidebar-list-fullscreen">
          {sets.map((s) => (
            <button 
              key={s.id} 
              className={`sidebar-item-fullscreen ${(s.publicSlug || s.code) === currentSlug ? 'active' : ''}`} 
              onClick={() => handleSelect(s)}
            >
              <div className="sidebar-item-title-fullscreen">{formatFullDate(s.date)}</div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Overlay para cerrar sidebar en mobile */}
      {sidebarOpen && <div className="sidebar-overlay-fullscreen" onClick={() => setSidebarOpen(false)}></div>}

      {/* Controles minimalistas - aparecen solo al mover el mouse */}
      <div className={`public-controls-fullscreen ${showControls ? 'visible' : ''}`}>
        <button 
          className="control-btn-fullscreen hamburger-fullscreen" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Ver listado"
        >
          ☰
        </button>
        <div className="control-info-fullscreen">
          {headerLabel && <span className="control-title">{headerLabel}</span>}
        </div>
        {/* back button intentionally removed for public published view */}
      </div>

      {/* Contenedor del iframe - fullscreen */}
      <div className="public-iframe-fullscreen-wrap">
        {currentSlug ? (
          <IframeLoader slug={currentSlug} />
        ) : (
          <div className="public-empty-fullscreen">
            <p>Selecciona un aviso para ver su contenido.</p>
            <button onClick={() => setSidebarOpen(true)} className="btn-open-sidebar">
              Abrir listado
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IframeLoader({ slug }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let canceled = false;

    const isDevVite = typeof window !== 'undefined' && window.location && (window.location.port === '5173' || window.location.port === '5174');

    const tryStatic = async () => {
      // In Vite dev server prefer backend endpoint to avoid loading the dev SPA as a static page
      if (isDevVite) {
        setSrc(apiUrl(`/public/sets/${slug}?format=html`));
        return;
      }

      const candidates = [
        `/avisos-semanales/${slug}/`,
        `/dist-public/${slug}/`,
        `${window.location.protocol}//${window.location.hostname}:5000/${slug}/`,
      ];

      for (const staticUrl of candidates) {
        try {
          const res = await fetch(staticUrl, { method: 'GET' });
          if (canceled) return;
          if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
            setSrc(staticUrl);
            return;
          }
        } catch (e) {
          // network/CORS error — continue to next candidate
        }
      }

      // fallback to backend HTML endpoint
      setSrc(apiUrl(`/public/sets/${slug}?format=html`));
    };

    tryStatic();

    return () => { canceled = true; };
  }, [slug]);

  if (!src) {
    return (
      <div className="public-iframe-loading">
        <p>Cargando aviso…</p>
      </div>
    );
  }

  return (
    <iframe
      title={`Aviso ${slug}`}
      src={src}
      className="public-iframe-fullscreen"
      sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
    />
  );
}
