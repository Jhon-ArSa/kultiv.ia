import { apiFetch } from './api';
import { useTranslation } from "./i18n";
import React, { useEffect, useRef, useState } from 'react';
const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export default function ClimaAnual({
  distrito,
  nombreLugar
}) {
  const {
    tr
  } = useTranslation();
  const [datos, setDatos] = useState(null),
    [error, setError] = useState(''),
    [intento, setIntento] = useState(0);
  const [gpm, setGpm] = useState(null);
  const [estadoGpm, setEstadoGpm] = useState('');
  const [pronostico, setPronostico] = useState(null);
  const [errorPronostico, setErrorPronostico] = useState(false);
  const [referencia, setReferencia] = useState(null);
  const [errorReferencia, setErrorReferencia] = useState(false);
  const solicitudGpm = useRef(null);
  useEffect(() => {
    const c = new AbortController();
    solicitudGpm.current?.abort();
    setDatos(null);
    setPronostico(null);
    setReferencia(null);
    setErrorReferencia(false);
    setErrorPronostico(false);
    setGpm(null);
    setEstadoGpm('');
    setError('');
    apiFetch(`/clima-anual/${encodeURIComponent(distrito)}?actual=true`,  {
      signal: c.signal
    }).then(async r => {
      const x = await r.json();
      if (!r.ok) throw new Error(x.detail);
      return x;
    }).then(setDatos).catch(e => {
      if (e.name !== 'AbortError') setError(e.message || 'No se pudo obtener la información.');
    });
    apiFetch(`/pronostico/${encodeURIComponent(distrito)}`, { signal: c.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPronostico).catch(e => { if (e.name !== 'AbortError') setErrorPronostico(true); });
    apiFetch(`/referencia-climatica/${encodeURIComponent(distrito)}`, { signal: c.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setReferencia).catch(e => { if (e.name !== 'AbortError') setErrorReferencia(true); });
    return () => { c.abort(); solicitudGpm.current?.abort(); };
  }, [distrito, intento]);
  const cargarGpm = async () => {
    solicitudGpm.current?.abort();
    const control = new AbortController();
    solicitudGpm.current = control;
    setEstadoGpm('Consultando lluvia satelital…');
    try {
      const respuesta = await apiFetch(`/lluvia-gpm-anual/${encodeURIComponent(distrito)}`,  { signal: control.signal });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) throw new Error(cuerpo.detail);
      if (!control.signal.aborted) { setGpm(cuerpo); setEstadoGpm(''); }
    } catch (error) {
      if (!control.signal.aborted) setEstadoGpm('No se pudo consultar GPM IMERG. Inténtalo de nuevo.');
    }
  };
  const fechaPeru = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const mesActual = Number(fechaPeru.slice(5, 7));
  const anoActual = Number(fechaPeru.slice(0, 4));
  const estimados = referencia?.meses.filter(m => m.mes > mesActual) || [];
  const max = Math.max(1, ...(datos?.meses || []).map(m => m.lluvia_mm_dia ?? 0), ...estimados.map(m => m.lluvia_mm_dia ?? 0));
  return <section className="calendar-section clima-anual" id="clima-anual"><p className="eyebrow">{tr("CONOCE EL CLIMA DE TU ZONA")}</p><h2>{tr("Lluvia y temperatura durante el año")}</h2><p>{tr("Datos disponibles de este año para ")}<strong>{tr(nombreLugar)}</strong>{tr(". NASA POWER publica los registros con retraso; el mes actual puede estar incompleto.")}</p>
    {error && <p role="alert">{tr(error)} <button onClick={() => setIntento(i => i + 1)}>{tr("Reintentar")}</button></p>}
    {!datos && !error && <p role="status">{tr("Buscando datos históricos de NASA…")}</p>}
    {(datos || referencia) && <><h3>{tr("Lluvia promedio diaria por mes · ")}{datos?.ano || anoActual}</h3><div className="rain-legend"><span><i className="rain-legend-observed" />{tr('Datos NASA del año actual')}</span><span><i className="rain-legend-estimate" />{tr('Referencia histórica para meses futuros')}</span></div><div className="rain-chart" aria-hidden="true">{meses.map((nombre, i) => { const m = datos?.meses?.[i]; const futuro = i + 1 > mesActual; const r = futuro ? referencia?.meses?.[i] : null; const valor = futuro ? r?.lluvia_mm_dia : m?.lluvia_mm_dia; return <div className="rain-column" key={nombre}><span>{valor == null ? '—' : valor}</span><div className="rain-track"><div className={`rain-fill ${futuro ? 'rain-estimate' : ''}`} style={{ height: `${valor == null ? 0 : Math.max(2, valor / max * 100)}%` }} /></div><strong>{tr(nombre)}</strong><small>{futuro && valor != null ? tr('Referencia') : m?.parcial && m.dias_disponibles > 0 ? tr('Parcial') : '\u00a0'}</small></div>; })}</div><p>{tr('Lluvia media en milímetros por día. El mes actual muestra solo los días disponibles; los meses futuros muestran una referencia histórica, no datos observados de este año.')}</p><details><summary>{tr("Ver todos los valores de lluvia y temperatura")}</summary><div className="table-scroll"><table><thead><tr><th>{tr("Mes")}</th><th>{tr("Lluvia media (mm/día)")}</th><th>{tr("Temperatura media (°C)")}</th><th>{tr('Origen')}</th></tr></thead><tbody>{meses.map((nombre, i) => { const futuro = i + 1 > mesActual; const m = futuro ? referencia?.meses?.[i] : datos?.meses?.[i]; return <tr key={nombre}><th>{tr(nombre)}</th><td>{m?.lluvia_mm_dia ?? tr('Sin datos')}</td><td>{m?.temperatura_c ?? tr('Sin datos')}</td><td>{futuro ? m?.lluvia_mm_dia != null ? `${tr('Referencia histórica')} (${m.anos_lluvia} ${tr('años')})` : tr('Sin datos') : m?.dias_disponibles ? `${tr('NASA')} · ${m.dias_disponibles} ${tr('días')}` : tr('Sin datos')}</td></tr>; })}</tbody></table></div></details></>}
    <div className="climate-reference"><h3>{tr('Estimación para los meses que faltan')}</h3>{errorReferencia ? <p role="status">{tr('No se pudo cargar el historial para calcular la referencia.')} <button type="button" onClick={() => setIntento(i => i + 1)}>{tr('Reintentar')}</button></p> : !referencia ? <p role="status">{tr('Consultando el historial de NASA POWER…')}</p> : estimados.length === 0 ? <p>{tr('No quedan meses completos por delante en este año.')}</p> : <>{estimados.map(m => <p key={m.mes}><strong>{tr(meses[m.mes - 1])} {anoActual}:</strong> {m.lluvia_mm_dia == null ? tr('Historial insuficiente para calcular una referencia.') : <>{m.lluvia_mm_dia} mm/{tr('día')} · {tr('temperatura media')} {m.temperatura_c == null ? tr('sin datos') : `${m.temperatura_c} °C`} ({m.anos_lluvia} {tr('años con datos de lluvia')})</>}</p>)}<p>{tr('Referencia calculada como el promedio del mismo mes en los últimos cinco años completos de NASA POWER')} ({referencia.desde}–{referencia.hasta}). {tr('Se necesitan al menos tres años con datos. No usa todas las fuentes de la app ni predice eventos específicos: la lluvia real puede diferir mucho. Consulta el pronóstico y los avisos de SENAMHI antes de decidir.')}</p></>}</div>
    <div className="forecast-year"><h3>{tr('Pronóstico para los próximos días')}</h3><p>{tr('Este pronóstico es de corto plazo. Los meses restantes del año todavía no tienen un pronóstico diario fiable en esta aplicación.')}</p>{errorPronostico ? <p role="status">{tr('No se pudo cargar el pronóstico. Inténtalo de nuevo.')}</p> : !pronostico ? <p role="status">{tr('Consultando el pronóstico…')}</p> : <div className="forecast-year-grid">{pronostico.dias.map(d => <article key={d.fecha}><strong>{d.fecha}</strong><span>{tr('Temperatura mínima')}: {d.minima == null ? '—' : `${d.minima} °C`}</span><span>{d.lluvia_por_hora?.length ? `${tr('Probabilidad de lluvia por horario')}: ${Math.min(...d.lluvia_por_hora.map(h => h.probabilidad_lluvia))}–${Math.max(...d.lluvia_por_hora.map(h => h.probabilidad_lluvia))}%` : tr('Probabilidad de lluvia no disponible')}</span></article>)}</div>}<p className="source">{tr('Fuente: wttr.in; pronóstico aproximado y sujeto a cambios. Consulta los avisos oficiales de SENAMHI.')}</p></div>
    <div className="gpm-history"><button type="button" onClick={cargarGpm} disabled={estadoGpm === 'Consultando lluvia satelital…'}>{tr(gpm ? 'Actualizar lluvia satelital GPM' : 'Ver lluvia satelital GPM')}</button><p role="status">{tr(estadoGpm)}</p>
      {gpm?.ubicacion === distrito && <><p><strong>{tr('NASA GPM IMERG')} · {gpm.ano}</strong>. {tr('Lluvia estimada por satélite en una zona de unos 10 km. Es historia, no pronóstico ni medición de la parcela.')}</p><div className="table-scroll"><table><thead><tr><th>{tr('Mes')}</th><th>{tr('Lluvia satelital total (mm/mes)')}</th></tr></thead><tbody>{gpm.meses.map(m => <tr key={m.mes}><th>{tr(meses[m.mes - 1])}</th><td>{m.lluvia_total_mm == null ? tr('Sin mes completo') : Number(m.lluvia_total_mm).toLocaleString('es-PE', { maximumFractionDigits: 1 })}</td></tr>)}</tbody></table></div><p className="source">{tr('IMERG utiliza días UTC; un mes incompleto queda sin total. Los datos pueden publicarse con retraso.')}</p></>}
    </div><p className="source">{tr("Fuente: NASA POWER, promedio mensual para una celda regional. No permite diagnosticar sequía en tu parcela. Para previsiones y alertas consulta ")}<a href="https://www.gob.pe/100546-consultar-el-clima-y-avisos-meteorologicos-con-la-aplicacion-senamhi-peru-movil" target="_blank" rel="noreferrer">{tr("SENAMHI")}</a>.</p></section>;
}

