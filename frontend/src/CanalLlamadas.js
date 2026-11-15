import React, { useState } from 'react';
import { useTranslation } from './i18n';
import { apiFetch } from './api';
import './CanalLlamadas.css';

const preguntas = [
  { id: 'rotacion', texto: '¿Cómo puedo planear la rotación después de cosechar papa?' },
  { id: 'clima', texto: '¿Cómo estuvo el clima en mi zona?' },
  { id: 'siembra', texto: '¿Qué debo revisar antes de sembrar?' },
  { id: 'lluvia', texto: '¿Va a llover?' },
];

export default function CanalLlamadas({ nombreLugar, distrito, datos }) {
  const { tr } = useTranslation();
  const [llamada, setLlamada] = useState(false);
  const [pregunta, setPregunta] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(false);
  const clima = datos?.fecha
    ? `Para ${nombreLugar}, NASA POWER registró el ${datos.fecha} una temperatura media de ${datos.temperatura} °C y ${datos.precipitacion} mm de lluvia. Es un registro regional anterior, no un pronóstico.`
    : `Todavía no tengo un registro climático confirmado para ${nombreLugar}. Puedes volver a consultar los datos de tu zona.`;
  const respuestas = {
    rotacion: 'Para planear la siguiente campaña, cuéntame qué sembraste antes, dónde está tu parcela y si cuentas con riego. Alternar familias de cultivos puede ayudar a organizar la rotación; revisa las opciones en el planificador y confirma su adaptación local antes de decidir.',
    clima,
    siembra: `Antes de sembrar en ${nombreLugar}, revisa el calendario del cultivo, la lluvia reciente, el suelo, la altitud y el agua disponible. Confirma la variedad y la fecha con un técnico local.`,
    lluvia: 'Los registros de NASA POWER muestran lo que ocurrió, pero no indican si lloverá mañana. Consulta el pronóstico oficial de SENAMHI para tomar esa decisión.',
  };
  const hablar = () => {
    if (!respuesta || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(respuesta.replace(/[*_#]/g, ''));
    voz.lang = 'es-PE';
    voz.rate = 0.9;
    window.speechSynthesis.speak(voz);
  };
  const consultar = async item => {
    setPregunta(item.id);
    setRespuesta('');
    setCargando(true);
    try {
      const solicitud = await apiFetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ubicacion: distrito, mensajes: [{ role: 'user', content: item.texto }], contexto: { datos_power: datos ? { fecha: datos.fecha, temperatura_media_c: datos.temperatura, lluvia_mm: datos.precipitacion } : null } }) });
      const resultado = await solicitud.json();
      setRespuesta(solicitud.ok && resultado.respuesta ? resultado.respuesta : respuestas[item.id]);
    } catch {
      setRespuesta(respuestas[item.id]);
    } finally {
      setCargando(false);
    }
  };
  const colgar = () => {
    window.speechSynthesis?.cancel();
    setLlamada(false);
    setPregunta(null);
    setRespuesta('');
  };

  return <section className="calls-page" aria-labelledby="calls-title">
    <div className="calls-heading"><p className="eyebrow">{tr('TU PRÓXIMA CAMPAÑA EMPIEZA CON UNA CONVERSACIÓN')}</p><h1 id="calls-title">{tr('Planea tus cultivos. Solo hablando.')}</h1><p>{tr('El canal de llamadas con IA de kultiv.IA está pensado para ayudarte a organizar la rotación de tus cultivos sin aprender a usar una aplicación. Llamarías desde tu teléfono, contarías cómo está tu campo y escucharías orientación para tu siguiente campaña.')}</p><span className="calls-status">{tr('Prototipo interactivo · canal telefónico aún no habilitado')}</span><div className="calls-benefits"><span>{tr('Conversación con palabras sencillas')}</span><span>{tr('Orientación según tu zona')}</span><span>{tr('Planificación por campañas')}</span></div></div>
    <div className="calls-layout">
      <div className="calls-explainer">
        <h2>{tr('¿Qué pasaría cuando llames?')}</h2>
        <ol><li><strong>1. {tr('La IA te da la bienvenida')}</strong><span>{tr('Te pregunta en qué distrito o comunidad está tu campo para buscar la información de esa zona.')}</span></li><li><strong>2. {tr('Le cuentas qué has sembrado')}</strong><span>{tr('Conversan sobre el cultivo anterior, el agua disponible y la campaña que quieres preparar. Tu ubicación por sí sola no revela estos datos.')}</span></li><li><strong>3. {tr('Consultas tu próxima siembra')}</strong><span>{tr('Puedes preguntar qué cultivos alternar, cómo interpretar el calendario o qué condiciones de clima conviene revisar. La IA explica los datos disponibles, sus fechas y lo que falta por conocer.')}</span></li><li><strong>4. {tr('Escuchas los siguientes pasos')}</strong><span>{tr('Recibes orientación para preparar tu plan de rotación y puedes pedir que te repita la explicación. Antes de sembrar, confirma las condiciones de tu parcela con un técnico local.')}</span></li></ol>
        <a className="calls-planner-link" href="/rotacion">{tr('Abrir el planificador de rotación')} <span aria-hidden="true">→</span></a>
        <div className="calls-note"><strong>{tr('Información responsable')}</strong><p>{tr('La llamada usaría datos regionales disponibles y referencias de cultivo. Para saber si conviene sembrar en una parcela se necesitan también suelo, riego, variedad y una revisión local. El historial NASA no es un pronóstico.')}</p></div>
      </div>
      <div className="phone-mockup" aria-label={tr('Demostración de una llamada')}><div className="phone-speaker" /><div className="phone-screen"><span className="phone-tag">kultiv.IA · {tr('demostración')}</span><div className="phone-avatar" aria-hidden="true">☎</div><h2>{llamada ? tr('Llamada de ejemplo') : tr('Asistente por voz')}</h2><p>{llamada ? tr(`Zona seleccionada: ${nombreLugar}`) : tr('Prueba cómo se escucharía una consulta agrícola.')}</p>{!llamada ? <button className="call-start" type="button" onClick={() => setLlamada(true)}>{tr('Iniciar demostración')}</button> : <><div className="call-questions">{preguntas.map(item => <button key={item.id} type="button" disabled={cargando} className={pregunta === item.id ? 'selected' : ''} onClick={() => consultar(item)}>{tr(item.texto)}</button>)}</div>{pregunta && <div className="call-answer" role="status"><strong>{tr('Respuesta del asistente')}</strong><p>{cargando ? tr('Consultando la información…') : respuesta}</p>{respuesta && <button type="button" onClick={hablar}>{tr('Escuchar respuesta')}</button>}</div>}<button className="call-end" type="button" onClick={colgar}>{tr('Terminar demostración')}</button></>}</div></div>
    </div>
    <p className="calls-footnote">{tr('Esta pantalla muestra el funcionamiento propuesto. Todavía no existe un número público ni una conexión de llamadas reales.')}</p>
  </section>;
}
