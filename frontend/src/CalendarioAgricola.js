import { useTranslation } from "./i18n";
import React, { useEffect, useState } from 'react';
import { referencias, regiones } from './zonas';
import { cultivos } from './Siembras';
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const mostrar = (valor, unidad) => typeof valor === 'number' && Number.isFinite(valor) ? `${valor.toLocaleString('es-PE', {
  maximumFractionDigits: 1
})} ${unidad}` : 'No disponible';
export default function CalendarioAgricola({
  distrito,
  setDistrito,
  lugares,
  mes,
  setMes,
  cultivo,
  setCultivo
}) {
  const {
    tr, locale
  } = useTranslation();
  const ficha = cultivos.find(c => c.nombre === cultivo);
  const referencia = referencias(distrito, mes).includes(cultivo);
  const [historico, setHistorico] = useState(null);
  const [pronostico, setPronostico] = useState(null);
  const [estadoHist, setEstadoHist] = useState('cargando');
  const [estadoPron, setEstadoPron] = useState('cargando');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    const control = new AbortController();
    setHistorico(null);
    setPronostico(null);
    setEstadoHist('cargando');
    setEstadoPron('cargando');
    const cargar = (ruta, guardar, estado) => fetch(`${API}/${ruta}/${encodeURIComponent(distrito)}`, {
      signal: control.signal
    }).then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(datos => {
      guardar(datos);
      estado('listo');
    }).catch(e => {
      if (e.name !== 'AbortError') estado('error');
    });
    cargar('clima-anual', setHistorico, setEstadoHist);
    cargar('pronostico', setPronostico, setEstadoPron);
    return () => control.abort();
  }, [distrito, intento]);
  const historialMes = historico?.meses?.find(m => m.mes === mes + 1);
  const fechas = (pronostico?.dias || []).filter(d => Number(d.fecha.slice(5, 7)) === mes + 1);
  const opcionesMes = referencias(distrito, mes);
  return <section className="calendar-section calendario-agricola" id="calendario-agricola"><p className="eyebrow">{tr("PLANEA TU CAMPAÑA")}</p><h2>{tr("¿Cuándo puedo sembrar?")}</h2><p>{tr("Elige un cultivo y toca un mes para conocer las opciones y el clima de tu zona.")}</p>
    <div className="agro-filters"><label>{tr("Cultivo")}<select value={cultivo} onChange={e => setCultivo(e.target.value)}>{tr(cultivos.map(c => <option key={c.nombre} value={c.nombre}>{tr(c.nombre)}</option>))}</select></label><label>{tr("Zona")}<select value={distrito} onChange={e => setDistrito(e.target.value)}>{tr(!lugares.length && <option value="Huancayo">{tr("Huancayo")}</option>)}{tr(lugares.map(l => <option key={l.nombre} value={l.nombre}>{tr(l.etiqueta || l.nombre)}{tr(regiones[l.nombre] ? ` · ${regiones[l.nombre]}` : '')}</option>))}</select></label></div>
    <div className="crop-decision"><div><p className="eyebrow">{tr("TU PUNTO DE PARTIDA · ")}{tr(meses[mes].toUpperCase())}</p><h3>{tr("¿Qué cultivos revisar para esta zona?")}</h3><p>{tr(opcionesMes.length ? `En tu región hay referencias de siembra para ${opcionesMes.join(' y ')} este mes.` : 'La guía aún no tiene una referencia regional de siembra para este mes y esta zona.')}</p><p>{tr("Estas referencias no confirman que el cultivo sea adecuado para tu parcela. Revisa agua, suelo, variedad y el clima antes de decidir.")}</p></div><div className="crop-decision-actions">{tr(cultivos.map(c => <button type="button" key={c.nombre} aria-pressed={cultivo === c.nombre} onClick={() => setCultivo(c.nombre)}>{tr(c.nombre)}<small>{tr(opcionesMes.includes(c.nombre) ? 'Con referencia este mes' : 'Consultar ficha')}</small></button>))}</div><div className="crop-decision-links"><a href="#rotacion">{tr("Preparar mi plan de rotación →")}</a><a href="#siembras">{tr("Comparar fichas de cultivos →")}</a></div></div>
    <div className="agro-calendar-header"><div><h3>{tr(cultivo)} · {tr(regiones[distrito] || 'Zona seleccionada')}</h3><p>{tr("Selecciona un mes para ver su información.")}</p></div><span>{tr("Calendario anual")}</span></div><div className="agro-legend"><span><i className="agro-swatch known" />{tr(" Hay una referencia de siembra")}</span><span><i className="agro-swatch unknown" />{tr(" Aún no hay referencia")}</span></div>
    <p className="climate-calendar-hint">{tr("En cada mes se muestra lluvia histórica de NASA POWER para ")}{tr(historico?.ano || 'el último año completo')}{tr(". Toca un mes para ver más detalles y el pronóstico de corto plazo cuando esté disponible.")}</p>
    <div className="agro-months">{tr(meses.map((nombre, i) => {
        const tiene = referencias(distrito, i).includes(cultivo);
        const clima = historico?.meses?.find(m => m.mes === i + 1);
        return <button type="button" key={nombre} onClick={() => setMes(i)} aria-pressed={i === mes} className={`${tiene ? 'known' : 'unknown'} ${i === mes ? 'active' : ''}`}><strong>{tr(nombre.slice(0, 3))}</strong><span>{tr(tiene ? 'Referencia de siembra' : 'Sin referencia')}</span><span>{tr(clima?.lluvia_mm_dia != null ? `Lluvia histórica: ${mostrar(clima.lluvia_mm_dia, 'mm/día')}` : 'Sin dato de lluvia')}</span></button>;
      }))}</div>
    <div className="calendar-climate" aria-live="polite"><div className="calendar-climate-heading"><div><p className="eyebrow">{tr("CLIMA DE ")}{tr(meses[mes].toUpperCase())}</p><h3>{tr("Agua y temperatura en tu zona")}</h3></div><span>{tr("Revisa siempre la fecha")}</span></div>
      {tr((estadoHist === 'error' || estadoPron === 'error') && <p className="space-warning" role="status">{tr(estadoHist === 'error' ? 'No se pudo cargar el historial NASA. ' : '')}{tr(estadoPron === 'error' ? 'No se pudo cargar el pronóstico. ' : '')}<button type="button" onClick={() => setIntento(i => i + 1)}>{tr("Reintentar")}</button></p>)}
      <div className="calendar-climate-grid"><article><h4>{tr("Así fue ")}{tr(meses[mes])}{tr(" de ")}{tr(historico?.ano || 'el último año completo')}</h4>{tr(estadoHist === 'cargando' ? <p role="status">{tr("Consultando NASA POWER…")}</p> : estadoHist === 'error' ? <p>{tr("Historial no disponible.")}</p> : <><div className="climate-values"><div><span>{tr("Lluvia media")}</span><strong>{tr(mostrar(historialMes?.lluvia_mm_dia, 'mm/día'))}</strong></div><div><span>{tr("Temperatura mínima media")}</span><strong>{tr(mostrar(historialMes?.minima_media_c, '°C'))}</strong></div><div><span>{tr("Temperatura media")}</span><strong>{tr(mostrar(historialMes?.temperatura_c, '°C'))}</strong></div></div><p>{tr("Estos datos muestran cómo fue el clima en una zona amplia durante el año indicado. La lluvia es un promedio por día. No nos dicen si habrá heladas o lluvias este año.")}</p></>)}</article>
      <article><h4>{tr("Próximos días para ")}{tr(meses[mes])}</h4>{tr(estadoPron === 'cargando' ? <p role="status">{tr("Consultando el pronóstico…")}</p> : estadoPron === 'error' ? <p>{tr("Pronóstico no disponible.")}</p> : fechas.length === 0 ? <p>{tr("El servicio aún no ofrece pronóstico para este mes. Consulta nuevamente más cerca de la fecha.")}</p> : <div className="short-forecast">{tr(fechas.map(d => <div key={d.fecha}><strong>{tr(new Date(`${d.fecha}T12:00:00`).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                }))}</strong><span>{tr("Mínima: ")}{tr(mostrar(d.minima, '°C'))}</span><span>{tr(typeof d.minima !== 'number' || !Number.isFinite(d.minima) ? 'Sin dato de temperatura mínima' : d.minima <= 0 ? 'Temperatura prevista ≤ 0 °C: posible helada' : 'Temperatura mínima prevista superior a 0 °C')}</span>{tr(d.lluvia_por_hora?.length ? <details><summary>{tr("Ver probabilidad de lluvia por horario")}</summary>{tr(d.lluvia_por_hora.map(h => <span key={h.hora}>{tr(h.hora)}: {tr(mostrar(h.probabilidad_lluvia, '%'))}</span>))}</details> : <span>{tr("Probabilidad de lluvia no disponible")}</span>)}</div>))}</div>)}<p>{tr("Pronóstico de wttr.in para una ubicación aproximada. La temperatura del aire ≤ 0 °C es una señal orientativa, no confirma ni descarta heladas en la parcela. Las probabilidades son por horario, no la probabilidad de todo el día. La cantidad de precipitación prevista no está disponible en esta fuente.")}</p></article></div>
      <p className="source">{tr("NASA POWER: estimaciones históricas regionales, no pronóstico. wttr.in: pronóstico de corto plazo, sujeto a cambios. Ninguno es una alerta oficial; consulta los ")}<a href="https://www.gob.pe/100546-consultar-el-clima-y-avisos-meteorologicos-con-la-aplicacion-senamhi-peru-movil" target="_blank" rel="noreferrer">{tr("avisos de SENAMHI ↗")}</a>.</p></div>
    <div className="agro-detail" aria-live="polite"><p className="eyebrow">{tr(meses[mes].toUpperCase())} · {tr(cultivo.toUpperCase())}</p><h3>{tr(referencia ? 'Hay una referencia de siembra para tu región' : 'Aún no tenemos una referencia de siembra para este mes')}</h3><p>{tr(ficha.periodo)}</p><p><strong>{tr("Qué revisar:")}</strong> {tr(ficha.factores)}</p><p><strong>{tr("Riesgos:")}</strong> {tr(ficha.riesgos)}</p><p><strong>{tr("¿Ya está listo para cosechar?")}</strong>{tr(" Este calendario ayuda a planificar siembras, pero no puede determinar la madurez del cultivo. Revisa la fecha de siembra, la variedad y el estado real de la planta con un técnico local.")}</p><p>{tr("La guía no dispone de fechas verificadas de crecimiento o cosecha para esta parcela. Una referencia regional no garantiza que sea el momento adecuado: confirma la variedad, lluvias, suelo y altitud con un técnico local.")}</p><a href="https://www.senamhi.gob.pe/load/file/04501SENA-119.pdf" target="_blank" rel="noreferrer">{tr("Consultar boletín de referencia SENAMHI ↗")}</a></div>
  </section>;
}
