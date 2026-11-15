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
  const solicitudGpm = useRef(null);
  useEffect(() => {
    const c = new AbortController();
    solicitudGpm.current?.abort();
    setDatos(null);
    setGpm(null);
    setEstadoGpm('');
    setError('');
    apiFetch(`/clima-anual/${encodeURIComponent(distrito)}`,  {
      signal: c.signal
    }).then(async r => {
      const x = await r.json();
      if (!r.ok) throw new Error(x.detail);
      return x;
    }).then(setDatos).catch(e => {
      if (e.name !== 'AbortError') setError(e.message || 'No se pudo obtener la información.');
    });
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
  const max = datos ? Math.max(1, ...datos.meses.map(m => m.lluvia_mm_dia ?? 0)) : 1;
  return <section className="calendar-section clima-anual" id="clima-anual"><p className="eyebrow">{tr("CONOCE EL CLIMA DE TU ZONA")}</p><h2>{tr("Lluvia y temperatura durante el año")}</h2><p>{tr("Así fue el último año completo disponible para ")}<strong>{tr(nombreLugar)}</strong>{tr(". Esta información ayuda a reconocer temporadas, pero no predice si habrá sequía o lluvia este año.")}</p>
    {tr(error ? <p role="alert">{tr(error)} <button onClick={() => setIntento(i => i + 1)}>{tr("Reintentar")}</button></p> : !datos ? <p role="status">{tr("Buscando datos históricos de NASA…")}</p> : <><h3>{tr("Lluvia promedio diaria por mes · ")}{tr(datos.ano)}</h3><div className="rain-chart" aria-label={tr(`Lluvia promedio diaria por mes en ${datos.ano}; consulta los valores en la tabla`)} aria-hidden="true">{tr(datos.meses.map(m => <div className="rain-column" key={m.mes}><span>{tr(m.lluvia_mm_dia == null ? '—' : m.lluvia_mm_dia)}</span><div className="rain-track"><div className="rain-fill" style={{
              height: `${m.lluvia_mm_dia == null ? 0 : Math.max(2, m.lluvia_mm_dia / max * 100)}%`
            }} /></div><strong>{tr(meses[m.mes - 1])}</strong></div>))}</div><p>{tr("Las barras muestran milímetros de lluvia por día, en promedio para cada mes. No son lluvia acumulada ni pronóstico.")}</p><details><summary>{tr("Ver todos los valores de lluvia y temperatura")}</summary><div className="table-scroll"><table><thead><tr><th>{tr("Mes")}</th><th>{tr("Lluvia media (mm/día)")}</th><th>{tr("Temperatura media (°C)")}</th></tr></thead><tbody>{tr(datos.meses.map(m => <tr key={m.mes}><th>{tr(meses[m.mes - 1])}</th><td>{tr(m.lluvia_mm_dia ?? 'Sin datos')}</td><td>{tr(m.temperatura_c ?? 'Sin datos')}</td></tr>))}</tbody></table></div></details></>)}
    <div className="gpm-history"><button type="button" onClick={cargarGpm} disabled={estadoGpm === 'Consultando lluvia satelital…'}>{tr(gpm ? 'Actualizar lluvia satelital GPM' : 'Ver lluvia satelital GPM')}</button><p role="status">{tr(estadoGpm)}</p>
      {gpm?.ubicacion === distrito && <><p><strong>{tr('NASA GPM IMERG')} · {gpm.ano}</strong>. {tr('Lluvia estimada por satélite en una zona de unos 10 km. Es historia, no pronóstico ni medición de la parcela.')}</p><div className="table-scroll"><table><thead><tr><th>{tr('Mes')}</th><th>{tr('Lluvia satelital total (mm/mes)')}</th></tr></thead><tbody>{gpm.meses.map(m => <tr key={m.mes}><th>{tr(meses[m.mes - 1])}</th><td>{m.lluvia_total_mm == null ? tr('Sin mes completo') : Number(m.lluvia_total_mm).toLocaleString('es-PE', { maximumFractionDigits: 1 })}</td></tr>)}</tbody></table></div><p className="source">{tr('IMERG utiliza días UTC; un mes incompleto queda sin total. Los datos pueden publicarse con retraso.')}</p></>}
    </div><p className="source">{tr("Fuente: NASA POWER, promedio mensual para una celda regional. No permite diagnosticar sequía en tu parcela. Para previsiones y alertas consulta ")}<a href="https://www.gob.pe/100546-consultar-el-clima-y-avisos-meteorologicos-con-la-aplicacion-senamhi-peru-movil" target="_blank" rel="noreferrer">{tr("SENAMHI")}</a>.</p></section>;
}

