import { useTranslation } from "./i18n";
import React from 'react';
import { referencias, regiones } from './zonas';
const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const cultivos = [{
  nombre: 'Papa',
  meses: [9, 10],
  periodo: 'Octubre–noviembre: referencias de siembra en zonas productoras de Junín, según campaña y variedad.',
  factores: 'Disponibilidad de agua para emergencia y desarrollo; temperatura y drenaje del suelo.',
  riesgos: 'Heladas, granizo, déficit de lluvia y exceso de humedad; la sensibilidad depende de la etapa.'
}, {
  nombre: 'Maíz',
  meses: [10],
  periodo: 'Noviembre: referencia para áreas de secano desde Junín hasta Ayacucho; la fecha cambia según la zona.',
  factores: 'Inicio y continuidad de las lluvias, humedad del suelo y temperatura durante la emergencia.',
  riesgos: 'Heladas, lluvias insuficientes y veranillos pueden afectar la germinación y el establecimiento.'
}, {
  nombre: 'Quinua',
  meses: [],
  periodo: 'Consultar el calendario y boletín local: no hay una ventana única validada aquí para todos los distritos.',
  factores: 'Lluvias, humedad del suelo y temperatura durante emergencia, floración y llenado del grano.',
  riesgos: 'Heladas, déficit hídrico y plagas; las siembras tardías pueden llegar al final de las lluvias.'
}, {
  nombre: 'Haba',
  meses: [],
  periodo: 'Consultar el calendario y boletín local para la variedad y altitud de la parcela.',
  factores: 'Disponibilidad de agua, temperatura y condiciones del suelo.',
  riesgos: 'Heladas, granizo y falta de humedad pueden afectar el cultivo según su etapa.'
}];
export default function Siembras({
  distrito,
  nombreLugar,
  lugares,
  setDistrito,
  mes,
  setMes
}) {
  const {
    tr
  } = useTranslation();
  const referenciasZona = referencias(distrito, mes);
  return <section className="calendar-section sowing" id="siembras"><p className="eyebrow">{tr("PLANIFICACIÓN AGRÍCOLA")}</p><h2>{tr("¿Qué puedo sembrar?")}</h2><p>{tr("Elige tu zona y un mes para explorar referencias de siembra, condiciones y riesgos.")}</p>
    <label htmlFor="zona-siembra">{tr("Zona seleccionada")}</label>{tr(' ')}<select id="zona-siembra" value={distrito} onChange={e => setDistrito(e.target.value)}>{tr(lugares.map(l => <option key={l.nombre} value={l.nombre}>{tr(l.etiqueta || l.nombre)} · {tr(regiones[l.nombre])}</option>))}</select>
    <div className="months" aria-label={tr("Mes de siembra")}>{tr(meses.map((nombre, i) => <button key={nombre} className={mes === i ? 'active' : ''} aria-pressed={mes === i} onClick={() => setMes(i)}>{tr(nombre)}</button>))}</div>
    <p><strong>{tr(nombreLugar)} · {tr(regiones[distrito])}:</strong> {tr(referenciasZona.length ? `Referencia regional para ${meses[mes]}: ${referenciasZona.join(' y ')}.` : 'No hay una referencia regional de siembra para este mes en esta guía.')}{tr(" La selección y el mes también se muestran en el mapa.")}</p>
    <p className="sowing-note">{tr("Las marcas identifican referencias publicadas para algunas zonas y campañas, no recomendaciones verificadas para cada distrito. Sin marca no significa que esté prohibido sembrar.")}</p>
    <div className="crop-grid">{tr(cultivos.map(c => <article className="crop-card" key={c.nombre}><div className="crop-heading"><h3>{tr(c.nombre)}</h3><span>{tr(referenciasZona.includes(c.nombre) ? `Referencia en ${regiones[distrito]}` : 'Consultar calendario local')}</span></div><p><strong>{tr("Época:")}</strong> {tr(c.periodo)}</p><p><strong>{tr("Factores climáticos:")}</strong> {tr(c.factores)}</p><p><strong>{tr("Riesgos:")}</strong> {tr(c.riesgos)}</p><p><strong>{tr("Antes de decidir:")}</strong>{tr(" verifica la humedad de tu suelo, la disponibilidad de riego, la variedad y los avisos locales para la etapa del cultivo.")}</p></article>))}</div>
    <p className="sowing-note">{tr("Esta guía no calcula aptitud ni riesgo específico: faltan datos de suelo, variedad, riego, altitud y etapa del cultivo. Consulta a un técnico local y los ")}<a href="https://www.gob.pe/9945-pronosticos-agrometeorologicos-del-senamhi" target="_blank" rel="noreferrer">{tr("pronósticos agrometeorológicos de SENAMHI")}</a>{tr(" antes de decidir.")}</p>
    <p className="sowing-note">{tr("Referencias: ")}<a href="https://www.senamhi.gob.pe/load/file/04501SENA-119.pdf" target="_blank" rel="noreferrer">{tr("boletín agrohidroclimático SENAMHI")}</a>, <a href="https://www.senamhi.gob.pe/load/file/04501SENA-134.pdf" target="_blank" rel="noreferrer">{tr("seguimiento de la campaña")}</a>{tr(" y ")}<a href="https://www.gob.pe/institucion/senamhi/noticias/1368644-sembrar-con-ciencia-la-quinua-y-el-desafio-climatico-del-altiplano-peruano" target="_blank" rel="noreferrer">{tr("análisis de quinua")}</a>.</p>
  </section>;
}
