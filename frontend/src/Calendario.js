import { apiFetch } from './api';
import { useTranslation } from "./i18n";
import React, { useEffect, useState } from 'react';
const fechaPeru = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());
const mostrar = (valor, unidad) => valor == null ? 'No disponible' : `${Number(valor).toLocaleString('es-PE', {
  maximumFractionDigits: 1
})} ${unidad}`;
export default function Calendario({
  distrito,
  nombreLugar
}) {
  const {
    tr, locale
  } = useTranslation();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  const [mes, setMes] = useState(() => fechaPeru().slice(0, 7));
  const [seleccion, setSeleccion] = useState(null);
  useEffect(() => {
    const control = new AbortController();
    setDatos(null);
    setSeleccion(null);
    setError('');
    setCargando(true);
    apiFetch(`/pronostico/${encodeURIComponent(distrito)}`,  {
      signal: control.signal
    }).then(async r => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.detail);
      return body;
    }).then(body => {
      setDatos(body);
      if (body.dias.length) {
        setMes(body.dias[0].fecha.slice(0, 7));
        setSeleccion(body.dias[0].fecha);
      }
    }).catch(e => {
      if (e.name !== 'AbortError') setError(e.message || 'No se pudo conectar con el servidor.');
    }).finally(() => {
      if (!control.signal.aborted) setCargando(false);
    });
    return () => control.abort();
  }, [distrito, intento]);
  const [ano, numeroMes] = mes.split('-').map(Number);
  const primerDia = new Date(ano, numeroMes - 1, 1);
  const espacios = (primerDia.getDay() + 6) % 7;
  const cantidad = new Date(ano, numeroMes, 0).getDate();
  const dias = datos?.dias || [];
  const elegido = dias.find(d => d.fecha === seleccion);
  const cambiarMes = delta => {
    const siguiente = new Date(ano, numeroMes - 1 + delta, 1);
    setMes(`${siguiente.getFullYear()}-${String(siguiente.getMonth() + 1).padStart(2, '0')}`);
    setSeleccion(null);
  };
  return <section className="calendar-section" id="pronostico" aria-labelledby="cal-titulo">
    <div className="calendar-intro"><div><p className="eyebrow">{tr("PLANIFICA TUS ACTIVIDADES")}</p><h2 id="cal-titulo">{tr("Calendario y pronóstico")}</h2><p>{tr("Navega por el año y consulta el pronóstico disponible para ")}{tr(nombreLugar)}.</p></div><a href="https://wttr.in/:help" target="_blank" rel="noreferrer">{tr("Fuente: wttr.in ↗")}</a></div>
    <div className="calendar-layout"><div className="calendar-card">
      <div className="calendar-nav"><button onClick={() => cambiarMes(-1)} aria-label={tr("Mes anterior")}>‹</button><h3>{tr(primerDia.toLocaleDateString(locale, {
              month: 'long',
              year: 'numeric'
            }))}</h3><button onClick={() => cambiarMes(1)} aria-label={tr("Mes siguiente")}>›</button></div>
      <div className="calendar-grid">{tr(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map(d => <span className="weekday" key={d}>{tr(d).slice(0, 3)}</span>))}
        {tr(Array.from({
            length: espacios
          }, (_, i) => <span key={`v${i}`} />))}
        {tr(Array.from({
            length: cantidad
          }, (_, i) => {
            const fecha = `${mes}-${String(i + 1).padStart(2, '0')}`;
            const dia = dias.find(d => d.fecha === fecha);
            return <button key={fecha} className={`calendar-day ${dia ? 'available' : ''} ${fecha === seleccion ? 'selected' : ''}`} disabled={!dia} onClick={() => setSeleccion(fecha)} aria-label={tr(`${fecha}${dia ? ', ver pronóstico' : ', sin pronóstico'}`)}><span>{tr(i + 1)}</span>{tr(dia && <small>{tr(dia.minima == null ? '—' : `${Math.round(dia.minima)}°`)}</small>)}</button>;
          }))}
      </div>
      <p className="calendar-hint">{tr("Los días resaltados tienen pronóstico; las demás fechas aún no están disponibles.")}</p>
    </div><div className="forecast-card" aria-live="polite">
      {tr(cargando && <p>{tr("Consultando el pronóstico…")}</p>)}
      {tr(error && <p className="error">{tr(error)} <button onClick={() => setIntento(i => i + 1)}>{tr("Reintentar")}</button></p>)}
      {tr(!cargando && !error && !elegido && <p>{tr("Selecciona un día resaltado para ver su pronóstico.")}</p>)}
      {tr(elegido && <><p className="eyebrow">{tr("PRONÓSTICO DIARIO · ")}{tr(nombreLugar)}</p><h3>{tr(new Date(`${elegido.fecha}T12:00:00`).toLocaleDateString(locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }))}</h3><div className="metrics"><div><span>{tr("Temperatura mínima")}</span><strong>{tr(mostrar(elegido.minima, '°C'))}</strong></div><div><span>{tr("Temperatura máxima")}</span><strong>{tr(mostrar(elegido.maxima, '°C'))}</strong></div></div></>)}
      <p className="source">{tr("Pronóstico de corto plazo de wttr.in, para una ubicación aproximada. Puede cambiar y no sustituye avisos oficiales. Los datos NASA POWER de arriba describen días anteriores.")}</p>
    </div></div>
  </section>;
}

