import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage, useTranslation } from './i18n';

const sections = [
  { id: 'contenido-principal', icon: '⌂', label: 'Inicio' },
  { id: 'rotacion', icon: '↻', label: 'Planea la rotación' },
  { id: 'llamadas', icon: '☎', label: 'Llamadas con IA' },
  { id: 'calendario-agricola', icon: '▦', label: 'Calendario agrícola' },
  { id: 'clima-anual', icon: '◉', label: 'Monitor climático' },
  { id: 'mapa-campo', icon: '⌖', label: 'Mapa agrícola' },
  { id: 'siembras', icon: '❧', label: '¿Qué puedo sembrar?' },
  { id: 'clima', icon: '☀', label: 'Datos de mi zona' },
  { id: 'asistente', icon: '◇', label: 'Hacer una pregunta' },
  { id: 'equipo', icon: '♧', label: 'Integrantes' },
];

export default function NavigationRail({ page, onNavigate }) {
  const { tr } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [active, setActive] = useState(page || 'contenido-principal');
  const [visibleCount, setVisibleCount] = useState(sections.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const barRef = useRef(null);
  const brandRef = useRef(null);
  const languageRef = useRef(null);
  const measureRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    const resize = () => {
      const width = barRef.current?.clientWidth;
      if (!width) return;
      const available = width - (brandRef.current?.offsetWidth || 0) - (languageRef.current?.offsetWidth || 0) - 104;
      const widths = [...(measureRef.current?.children || [])].map(item => item.getBoundingClientRect().width + 8);
      let used = 0;
      let count = 0;
      for (const itemWidth of widths) {
        if (used + itemWidth > available) break;
        used += itemWidth;
        count += 1;
      }
      setVisibleCount(Math.min(count, 4));
    };
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (observer && barRef.current) observer.observe(barRef.current);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [language]);

  useEffect(() => setActive(page || 'contenido-principal'), [page]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = event => { if (event.key === 'Escape' || (event.type === 'pointerdown' && !menuRef.current?.contains(event.target))) setMenuOpen(false); };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', close); };
  }, [menuOpen]);

  const navigate = id => {
    setActive(id);
    setMenuOpen(false);
    if (onNavigate) onNavigate(id);
    else if (id === 'asistente') window.dispatchEvent(new Event('abrir-asistente'));
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const button = item => <button key={item.id} type="button" className={`nav-button${active === item.id ? ' active' : ''}`} aria-current={active === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{tr(item.label)}</button>;

  return <header className="navigation-bar" ref={barRef}>
    <div className="nav-brand" ref={brandRef}><img src={`${process.env.PUBLIC_URL}/logo-02.jpeg`} alt="" /><div><strong>kultiv.IA</strong><small>{tr('Información para el campo')}</small></div></div>
    <nav className="nav-visible" aria-label={tr('Secciones')}>{sections.slice(0, visibleCount).map(button)}</nav>
    <div className="nav-overflow" ref={menuRef}>
      {visibleCount < sections.length && <button type="button" className="nav-menu-toggle" aria-label={tr('Más secciones')} aria-expanded={menuOpen} aria-controls="nav-extra" onClick={() => setMenuOpen(open => !open)}><span aria-hidden="true">☰</span><span>{tr('Menú')}</span></button>}
      {menuOpen && <nav className="nav-menu" id="nav-extra" aria-label={tr('Más secciones')}>{sections.slice(visibleCount).map(button)}</nav>}
    </div>
    <label className="nav-language" ref={languageRef}>🌐 <span className="visually-hidden">{tr('Idioma / Language')}</span><select value={language} onChange={event => setLanguage(event.target.value)}><option value="es">{tr('Español')}</option><option value="en">{tr('English')}</option><option value="qu">Quechua (orientativo)</option></select></label>
    <div className="nav-measure" ref={measureRef} aria-hidden="true">{sections.map(item => <span key={item.id} className="nav-button"><span className="nav-icon">{item.icon}</span>{tr(item.label)}</span>)}</div>
  </header>;
}
