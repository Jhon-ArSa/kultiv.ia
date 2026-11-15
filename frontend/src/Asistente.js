import { apiFetch } from './api';
import { useTranslation } from "./i18n";
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatTable from './ChatTable';
import { referencias, regiones } from './zonas';
import { cultivos } from './Siembras';
export default function Asistente({
  distrito,
  nombreLugar,
  mes,
  datos,
  indicadores,
  idioma
}) {
  const {
    tr, locale
  } = useTranslation();
  const [entrada, setEntrada] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(false);
  const solicitud = useRef(null);
  const finalMensajes = useRef(null);
  useEffect(() => {
    setMensajes([]);
    setError('');
    setCargando(false);
    return () => {
      solicitud.current?.abort();
      solicitud.current = null;
    };
  }, [distrito, idioma]);
  useEffect(() => {
    if (abierto) finalMensajes.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: 'smooth'
    });
  }, [mensajes, cargando, abierto]);
  useEffect(() => {
    const abrir = () => setAbierto(true);
    const enlace = e => {
      if (e.target.closest('a[href="#asistente"]')) abrir();
    };
    window.addEventListener('abrir-asistente', abrir);
    document.addEventListener('click', enlace);
    return () => {
      window.removeEventListener('abrir-asistente', abrir);
      document.removeEventListener('click', enlace);
    };
  }, []);
  const enviar = async pregunta => {
    const texto = pregunta.trim();
    if (!texto || solicitud.current) return;
    const controller = new AbortController();
    solicitud.current = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 75000);
    const usuario = {
      role: 'user',
      content: texto
    };
    const historial = [...mensajes, usuario].slice(-11);
    setMensajes(historial);
    setEntrada('');
    setError('');
    setCargando(true);
    let planRotacion = null;
    try {
      const plan = JSON.parse(localStorage.getItem('raices-rotacion-v1') || 'null');
      if (plan?.distrito === distrito && Array.isArray(plan.cultivos)) planRotacion = plan.cultivos.slice(0, 4);
    } catch {
      planRotacion = null;
    }
    const contexto = {
      zona: nombreLugar,
      region: regiones[distrito] || null,
      idioma_respuesta: idioma,
      plan_rotacion_guardado: planRotacion,
      mes_consultado: new Date(2024, mes, 1).toLocaleDateString(locale, {
        month: 'long'
      }),
      referencias_regionales: referencias(distrito, mes),
      fichas_cultivos: cultivos.map(({
        nombre,
        periodo,
        factores,
        riesgos
      }) => ({
        nombre,
        periodo,
        factores,
        riesgos
      })),
      datos_power: datos ? {
        fecha: datos.fecha,
        temperatura_media_c: datos.temperatura,
        minima_c: datos.temperatura_minima,
        lluvia_mm: datos.precipitacion,
        humedad_relativa_aire_porcentaje: datos.humedad_relativa,
        radiacion_solar_mj_m2_dia: datos.radiacion_solar_mj_m2_dia ?? null,
        radiacion_solar_fecha: datos.radiacion_solar_fecha ?? null
      } : null,
      indicadores_power_regionales: indicadores ? {
        fecha: indicadores.fecha,
        humedad_modelada_zona_raices_indice_0_a_1: indicadores.humedad_zona_raices,
        evaporacion_terrestre_mm_dia: indicadores.evaporacion_terrestre_mm
      } : null,
      ecostress: 'Se buscan escenas, pero no se han extraído ni validado valores ESI o PET.',
      avisos_senamhi: 'No se consultan automáticamente; disponibles mediante enlaces oficiales.'
    };
    try {
      const r = await apiFetch('/chat',  {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          mensajes: historial,
          contexto,
          ubicacion: distrito
        })
      });
      const body = await r.json();
      if (!r.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'No se pudo enviar la consulta.');
      if (typeof body.respuesta !== 'string' || !body.respuesta.trim()) throw new Error('El asistente no devolvió una respuesta. Inténtalo de nuevo.');
      if (solicitud.current === controller) setMensajes(actual => [...actual, {
        role: 'assistant',
        content: body.respuesta
      }]);
    } catch (e) {
      if (solicitud.current === controller) {
        setMensajes(historial.slice(0, -1));
        setEntrada(texto);
        setError(controller.signal.aborted ? 'El asistente tardó demasiado. Tu pregunta está lista para reintentar.' : e instanceof TypeError ? 'No se pudo conectar con el asistente.' : e.message);
      }
    } finally {
      clearTimeout(timeout);
      if (solicitud.current === controller) {
        solicitud.current = null;
        setCargando(false);
      }
    }
  };
  return <aside className="chat-float" id="asistente"><button className="chat-toggle" type="button" aria-expanded={abierto} aria-controls="ventana-asistente" onClick={() => setAbierto(!abierto)}>{tr(!abierto && <img className="chat-avatar" src={`${process.env.PUBLIC_URL}/logo-02.jpeg`} alt={tr("")} />)}{tr(abierto ? '✕ Cerrar' : 'Pregúntame')}</button>{tr(abierto && <section className="assistant chat-window" id="ventana-asistente" aria-label={tr("Asistente agrícola")}><header className="chat-header"><img className="chat-avatar" src={`${process.env.PUBLIC_URL}/logo-02.jpeg`} alt={tr("")} /><div><strong>{tr("Tu asistente agrícola")}</strong><span>{tr("Zona: ")}{tr(nombreLugar)}</span></div></header><div className="chat-body"><div className="assistant-messages" aria-live="polite"><div className="assistant-bubble">{tr("Hola. Puedo ayudarte a revisar siembras, clima y rotación. Elige una pregunta o escríbeme con tus propias palabras.")}</div>{tr(mensajes.map((m, i) => <div key={i} className={m.role === 'user' ? 'assistant-question' : 'assistant-bubble'}>{tr(m.role === 'assistant' ? <div className="chat-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: ChatTable }}>{m.content}</ReactMarkdown></div> : m.content)}</div>))}{tr(cargando && <div className="assistant-bubble" role="status">{tr("Consultando la información…")}</div>)}<div ref={finalMensajes} /></div><div className="assistant-suggestions"><button type="button" disabled={cargando} onClick={() => enviar(tr('¿Qué puedo sembrar en mi zona?'))}>{tr("¿Qué puedo sembrar?")}</button><button type="button" disabled={cargando} onClick={() => enviar(tr('¿Va a llover en mi zona?'))}>{tr("¿Va a llover?")}</button><button type="button" disabled={cargando} onClick={() => enviar(tr('¿Cómo puedo organizar la rotación de mis cultivos?'))}>{tr("Mi rotación")}</button><button type="button" disabled={cargando} onClick={() => enviar(tr('¿Qué debo revisar antes de cosechar?'))}>{tr("Antes de cosechar")}</button></div><form className="assistant-form" onSubmit={e => {
          e.preventDefault();
          enviar(entrada);
        }}><label className="visually-hidden" htmlFor="consulta-asistente">{tr("Escribe tu pregunta")}</label><input id="consulta-asistente" value={entrada} disabled={cargando} maxLength={500} onChange={e => setEntrada(e.target.value)} placeholder={tr("Escribe tu pregunta…")} /><button className="primary-action" type="submit" disabled={cargando || !entrada.trim()}>{tr("Enviar")}</button></form>{tr(error && <p className="error" role="alert">{tr(error)}{!error.includes('GROQ_API_KEY') && tr(" Puedes intentar de nuevo.")}</p>)}<p className="assistant-note">{tr("Al preguntar, se envían a Groq tu pregunta, historial reciente, zona, clima y plan de rotación guardado para esa zona. No se envía la dirección guardada ni las coordenadas GPS. Evita incluir datos personales. La IA puede equivocarse.")}</p><p className="assistant-note"><a href="https://www.gob.pe/100546-consultar-el-clima-y-avisos-meteorologicos-con-la-aplicacion-senamhi-peru-movil" target="_blank" rel="noreferrer">{tr("Consultar pronóstico oficial SENAMHI ↗")}</a> · <a href="https://www.gob.pe/9945-pronosticos-agrometeorologicos-del-senamhi" target="_blank" rel="noreferrer">{tr("Boletines agrícolas ↗")}</a></p></div></section>)}</aside>;
}

