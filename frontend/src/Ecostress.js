import React, { useEffect, useState } from 'react';
const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const fecha = valor => new Date(valor).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' });
export default function Ecostress({ distrito, nombreLugar, datos }) {
  const [resultado, setResultado] = useState(null);
  const [estado, setEstado] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    const control = new AbortController(); setResultado(null); setEstado('Buscando información de la NASA…');
    fetch(`${API}/ecostress/${encodeURIComponent(distrito)}`, { signal: control.signal })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d; })
      .then(d => { setResultado(d); setEstado(''); })
      .catch(e => { if (e.name !== 'AbortError') setEstado(e.message || 'No se pudo consultar ECOSTRESS.'); });
    return () => control.abort();
  }, [distrito, intento]);
  const ultima = resultado?.escenas[0];
  const power = resultado?.power_mismo_dia;
  return <section className="calendar-section ecostress" id="ecostress"><p className="eyebrow">DATOS DE LA NASA</p><h2>Observaciones desde el espacio</h2><p>Información para <strong>{nombreLugar}</strong>. La ubicación representa la zona elegida y puede estar lejos de tu chacra.</p>
    <div className="space-explainer"><strong>¿Qué es ECOSTRESS?</strong><p>Es un instrumento de la NASA que observa la temperatura de la superficie. Sus datos pueden ayudar a estudiar cómo usa agua la vegetación.</p></div>
    <div className="seguimiento-grid"><article className="forecast-card"><h3>🛰️ ¿Hay imágenes de mi zona?</h3><p role="status">{estado}</p>{estado && !estado.includes('Buscando') && <button type="button" onClick={() => setIntento(i => i + 1)}>Volver a intentar</button>}
      {resultado && (ultima ? <><div className="space-status"><strong>Se encontraron {resultado.escenas.length} registros</strong><span>La observación más reciente comenzó el {fecha(ultima.inicio_utc)}, hora de Perú.</span></div><p>La NASA encontró registros que coinciden con este punto durante los últimos {resultado.periodo_dias} días.</p><details><summary>Ver fechas y detalles técnicos</summary><ul>{resultado.escenas.map(e => <li key={e.id}>{fecha(e.inicio_utc)}<br /><small>{e.id}</small></li>)}</ul><p>Producto ECO_L4G_ESI.002 · Fuente: NASA CMR</p></details></> : <div className="space-status"><strong>No encontramos registros recientes</strong><span>No se encontraron escenas para este punto en los últimos {resultado.periodo_dias} días.</span></div>)}
      <p className="space-warning"><strong>Aún no podemos evaluar el cultivo.</strong> Encontrar una imagen no asegura que se vea el punto: las nubes y la calidad pueden afectar los datos. Todavía no se ha calculado el estrés de la vegetación en la aplicación.</p></article>
    <article className="forecast-card"><h3>🌦️ ¿Cómo estuvo el clima ese día?</h3>{ultima && (power ? <><p>NASA POWER estima que el <strong>{power.fecha}</strong>, día de la imagen más reciente, hubo:</p><div className="metrics"><div><span>Temperatura media</span><strong>{power.temperatura} °C</strong></div><div><span>Temperatura mínima</span><strong>{power.minima} °C</strong></div><div><span>Lluvia durante el día</span><strong>{power.lluvia} mm</strong></div><div><span>Humedad del aire</span><strong>{power.humedad} %</strong></div></div></> : <p>No hay datos completos de POWER para el día de la imagen más reciente.</p>)}{!ultima && <p>Si encontramos una imagen, aquí podrás comparar la fecha con el clima de ese día.</p>}{datos && <p>El último dato diario de lluvia disponible es del {datos.fecha}: {datos.precipitacion} mm.</p>}<p className="source">Son estimaciones de una zona amplia, no mediciones de tu parcela. La humedad indicada es del aire, no del suelo. Esta comparación no mide estrés del cultivo.</p><a href="https://doi.org/10.5067/ECOSTRESS/ECO_L4G_ESI.002" target="_blank" rel="noreferrer">Conocer la fuente ECOSTRESS ↗</a></article></div>
  </section>;
}
