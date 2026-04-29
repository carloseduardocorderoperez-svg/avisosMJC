import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiUrl } from "../utils/api";

export default function PublicAvisoView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(slug || null);
  const iframeRef = useRef(null);

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
    setOpen(false);
  };

  const iframeSrc = currentSlug ? apiUrl(`/public/sets/${currentSlug}?format=html`) : '';

  return (
    <div className="public-view-shell">
      <aside className={`public-sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <strong>Avisos publicados</strong>
          <button className="sidebar-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="sidebar-list">
          {sets.map((s) => (
            <button key={s.id} className={`sidebar-item ${s.publicSlug === currentSlug ? 'active' : ''}`} onClick={() => handleSelect(s)}>
              <div className="sidebar-item-title">{s.title}</div>
              <div className="sidebar-item-meta">{s.date}</div>
            </button>
          ))}
        </div>
      </aside>

      <div className="public-main">
        <div className="public-topbar">
          <button className="hamburger" onClick={() => setOpen((v) => !v)}>☰</button>
          <div className="public-top-title">{(sets.find(s => (s.publicSlug || s.code) === currentSlug) || {}).title || 'Avisos'}</div>
          <a className="public-back" href="/avisos-semanales">Listado</a>
        </div>

        <div className="public-iframe-wrap">
          {currentSlug ? (
            <iframe ref={iframeRef} title="Aviso público" src={iframeSrc} className="public-iframe" />
          ) : (
            <div className="public-empty">Selecciona un aviso para ver su contenido.</div>
          )}
        </div>
      </div>
    </div>
  );
}
