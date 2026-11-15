import { useTranslation, useLanguage } from "./i18n";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Calendario from './Calendario';
import Siembras from './Siembras';
import { regiones } from './zonas';
import Buscador from './Buscador';
import Asistente from './Asistente';
import CalendarioAgricola from './CalendarioAgricola';
import Rotacion from './Rotacion';
import ClimaAnual from './ClimaAnual';
import MapaCampo from './MapaCampo';
import './Workspace.css';
const API = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const formato = (valor, unidad) => `${Number(valor).toLocaleString('es-PE', {
  maximumFractionDigits: 1
})} ${unidad}`;
function Aplicacion() {
  const {
    tr
  } = useTranslation();
  const {
    language: idioma,
    setLanguage: setIdioma
  } = useLanguage();
  const idiomaTexto = {
    es: {
      rotation: 'Rotación',
      zone: 'Mi zona',
      forecast: 'Próximos días',
      calendar: 'Calendario agrícola',
      crop: 'Mi cultivo',
      chat: 'Hacer una pregunta',
      title: 'Planifica la rotación de tu chacra',
      description: 'Elige tu zona y organiza tus cultivos por campaña. Revisa el clima y las siembras para apoyar tu plan.',
      first: 'Elige tu zona',
      second: 'Planea la rotación',
      third: 'Consulta tus dudas',
      firstHelp: 'Busca tu comunidad',
      secondHelp: 'Organiza tus cultivos',
      thirdHelp: 'Pregunta al asistente',
      notice: ''
    }
  }.es;
  const [lugares, setLugares] = useState([]);
  const [distrito, setDistritoEstado] = useState('Huancayo');
  const cambiosZona = useRef(0);
  const setDistrito = useCallback(valor => {
    cambiosZona.current += 1;
    setDistritoEstado(valor);
  }, []);
  const [mesSiembra, setMesSiembra] = useState(() => new Date().getMonth());
  const [cultivoPlan, setCultivoPlan] = useState('Papa');
  const [ubicacion, setUbicacion] = useState(null);
  const [estadoUbicacion, setEstadoUbicacion] = useState('Aún no has compartido tu ubicación.');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [errorLugares, setErrorLugares] = useState(false);
  const [intento, setIntento] = useState(0);
  const ubicacionSolicitada = useRef(false);
  const solicitarUbicacion = useCallback(() => {
    if (!navigator.geolocation) {
      setEstadoUbicacion('Este navegador no permite acceder a la ubicación.');
      return;
    }
    setEstadoUbicacion('Buscando tu ubicación…');
    const revisionZona = cambiosZona.current;
    navigator.geolocation.getCurrentPosition(async pos => {
      setUbicacion({
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
        precision: pos.coords.accuracy
      });
      setEstadoUbicacion('Ubicación encontrada. Buscando una zona cercana…');
      try {
        const consulta = new URLSearchParams({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude
        });
        const respuesta = await fetch(`${API}/ubicacion-cercana?${consulta}`);
        if (!respuesta.ok) throw new Error();
        const resultado = await respuesta.json();
        if (cambiosZona.current !== revisionZona) {
          setEstadoUbicacion('Tu ubicación está en el mapa. Se conservó la zona que elegiste.');
          return;
        }
        if (!resultado.lugar) {
          setEstadoUbicacion('No encontramos una zona del catálogo cerca de tu ubicación. Busca tu distrito o comunidad por nombre.');
          return;
        }
        const lugar = resultado.lugar;
        regiones[lugar.id] = lugar.region;
        setLugares(actual => [...actual.filter(l => l.nombre !== lugar.id), {
          ...lugar,
          nombre: lugar.id,
          etiqueta: `${lugar.nombre} · ${lugar.distrito}, ${lugar.provincia}`
        }]);
        setDistritoEstado(lugar.id);
        setEstadoUbicacion(`Zona aproximada: ${lugar.nombre}, ${lugar.distrito} (${resultado.distancia_km} km del punto del catálogo). Confirma que sea tu zona; puedes cambiarla buscando su nombre.`);
      } catch {
        setEstadoUbicacion('Ubicación encontrada en el mapa. No se pudo identificar una zona cercana; busca tu distrito o comunidad por nombre.');
      }
    }, err => setEstadoUbicacion(err.code === 1 ? 'Permiso de ubicación denegado. Revisa los permisos del navegador.' : 'No se pudo obtener la ubicación. Comprueba el GPS e inténtalo de nuevo.'), {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });
  }, []);
  useEffect(() => {
    if (!ubicacionSolicitada.current) {
      ubicacionSolicitada.current = true;
      solicitarUbicacion();
    }
  }, [solicitarUbicacion]);
  const seleccionarLugar = lugar => {
    regiones[lugar.id] = lugar.region;
    setLugares(actual => [...actual.filter(l => l.nombre !== lugar.id), {
      ...lugar,
      nombre: lugar.id,
      etiqueta: `${lugar.nombre} · ${lugar.distrito}, ${lugar.provincia}`
    }]);
    setDistrito(lugar.id);
  };
  const nombreLugar = lugares.find(l => l.nombre === distrito)?.etiqueta || distrito;
  useEffect(() => {
    const controller = new AbortController();
    setErrorLugares(false);
    fetch(`${API}/distritos`, {
      signal: controller.signal
    }).then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(lista => setLugares(actual => [...lista, ...actual.filter(l => l.etiqueta)])).catch(e => {
      if (e.name !== 'AbortError') setErrorLugares(true);
    });
    return () => controller.abort();
  }, [intento]);
  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError('');
    setDatos(null);
    fetch(`${API}/semaforo/${encodeURIComponent(distrito)}`, {
      signal: controller.signal
    }).then(async r => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.detail);
      return body;
    }).then(setDatos).catch(e => {
      if (e.name !== 'AbortError') setError(e.message || 'No se pudo conectar con el servidor.');
    }).finally(() => {
      if (!controller.signal.aborted) setCargando(false);
    });
    return () => controller.abort();
  }, [distrito, intento]);
  const estados = {
    rojo: ['Temperatura bajo cero', 'La temperatura mínima estimada fue de 0 °C o menos.'],
    amarillo: ['Temperatura cercana a cero', 'La temperatura mínima estimada estuvo entre 0 y 4 °C.'],
    verde: ['Temperatura superior a 4 °C', 'La temperatura mínima estimada superó los 4 °C.']
  };
  return <div className="app"><a className="skip-link" href="#clima">{tr("Ir a mi zona y mapa")}</a>
    <header className="header">
      <div className="brand"><img className="brand-mascot" src={`${process.env.PUBLIC_URL}/logo-02.jpeg`} alt={tr("")} /><div><span>{tr("INFORMACIÓN PARA EL CAMPO")}</span><h1>{tr("kultiv.IA")}</h1></div></div>
      <nav className="top-nav" aria-label={tr("Secciones")}><a href="#clima">{tr(idiomaTexto.zone)}</a><a href="#calendario-agricola">{tr(idiomaTexto.calendar)}</a><a href="#rotacion">{tr(idiomaTexto.rotation)}</a><a href="#asistente" onClick={() => window.dispatchEvent(new Event('abrir-asistente'))}>{tr(idiomaTexto.chat)}</a></nav><label className="language-picker">🌐 <span className="visually-hidden">{tr("Idioma / Language")}</span><select value={idioma} onChange={e => setIdioma(e.target.value)}><option value="es">{tr("Español")}</option><option value="en">{tr("English")}</option><option value="qu" disabled>{tr("Quechua wanka (pendiente de validación)")}</option></select><small className="language-status">{tr("Quechua wanka: falta validar la traducción con hablantes locales.")}</small></label>
    </header>
    <section className="welcome" aria-label={tr("Guía de uso")}><div className="welcome-copy"><p className="eyebrow">{tr("kultiv.IA · PLANIFICACIÓN AGRÍCOLA")}</p><h2>{tr(idiomaTexto.title)}</h2><p>{tr(idiomaTexto.description)}</p><div className="hero-actions"><a className="hero-primary" href="#clima">{tr(idiomaTexto.first)} <span aria-hidden="true">↗</span></a><a className="hero-secondary" href="#rotacion">{tr(idiomaTexto.second)} <span aria-hidden="true">→</span></a></div>{tr(idioma === "qu" && <p className="language-note">{tr("Traducción orientativa al quechua wanka de Junín; pendiente de revisión por hablantes locales.")}</p>)}</div><div className="welcome-workflow"><div className="workflow-heading"><span>{tr("DE TU ZONA A TU PRÓXIMA SIEMBRA")}</span><svg aria-hidden="true" width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 30V16M18 22C8 23 6 15 7 9c8 0 13 4 11 13ZM18 17C18 8 24 5 30 6c0 7-4 12-12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div className="quick-steps"><a href="#clima"><span>01</span><strong>{tr(idiomaTexto.first)}</strong><small>{tr(idiomaTexto.firstHelp)}</small></a><a href="#calendario-agricola"><span>02</span><strong>{tr(idiomaTexto.calendar)}</strong><small>{tr("Consulta cultivos y clima por mes")}</small></a><a href="#rotacion"><span>03</span><strong>{tr(idiomaTexto.second)}</strong><small>{tr(idiomaTexto.secondHelp)}</small></a></div></div></section>
    <details className="guide-section" aria-label={tr("Conoce la aplicación")}><summary>{tr("¿Necesitas ayuda para usar la aplicación?")}</summary><p>{tr("Elige una opción para ver cómo usarla.")}</p><div className="guide-grid"><details><summary>{tr("🌦️ Conocer el tiempo")}</summary><p>{tr("Busca tu distrito o comunidad. Verás el último día disponible y podrás consultar los próximos días en el calendario. Revisa siempre la fecha.")}</p><a href="#clima">{tr("Buscar mi zona →")}</a></details><details><summary>{tr("🌱 Planear mis siembras")}</summary><p>{tr("Selecciona un mes para ver referencias de cultivos en tu región, sus necesidades y riesgos. La guía no confirma si una parcela es apta.")}</p><a href="#siembras">{tr("Ver siembras →")}</a></details><details><summary>{tr("Explorar mi zona")}</summary><p>{tr("Encuentra tu ubicación y cambia entre calles, imágenes satelitales y temperatura de la superficie.")}</p><a href="#mapa-campo">{tr("Explorar el mapa →")}</a></details><details><summary>{tr("💬 Pedir orientación")}</summary><p>{tr("Escribe una pregunta o elige una de las opciones. El asistente usa inteligencia artificial y no diagnostica el cultivo.")}</p><a href="#asistente">{tr("Hacer una pregunta →")}</a></details></div></details>
    <main id="contenido-principal"><div className="workspace-heading"><div><p className="eyebrow">{tr("01 / EXPLORA TU ZONA")}</p><h2>{tr("Busca tu zona y mira el mapa")}</h2></div><span className="zone-badge">{tr("Zona: ")}{tr(nombreLugar)}</span></div><div className="layout" id="clima">
      <section className="panel">
        <p className="eyebrow">{tr("TU CAMPO, MEJOR INFORMADO")}</p>
        <h2>{tr("Encuentra tu parcela")}</h2>
        <p className="intro">{tr("Escribe el nombre de tu distrito o comunidad y elígelo de la lista. Al inicio mostramos Huancayo como ejemplo.")}</p>
        <Buscador seleccionar={seleccionarLugar} />
        <details className="location-option"><summary>{tr("📍 Usar mi ubicación")}</summary><p>{tr("Con tu permiso mostraremos tu ubicación y buscaremos una zona cercana del catálogo. Verifica el resultado; el punto más cercano puede pertenecer a otra zona.")}</p><button className="location-action" type="button" onClick={solicitarUbicacion}>{tr("Mostrar mi ubicación")}</button></details><p className="search-hint" role="status">{tr(estadoUbicacion)}</p>
        <label htmlFor="distrito">{tr("O elige una zona de la lista")}</label>
        <select id="distrito" value={distrito} onChange={e => setDistrito(e.target.value)} disabled={!lugares.length}>
          {tr(!lugares.length && <option value="Huancayo">{tr("Huancayo")}</option>)}
          {tr(lugares.map(l => <option key={l.nombre} value={l.nombre}>{tr(l.etiqueta || l.nombre)}</option>))}
        </select>
        {tr(errorLugares && <p className="error" role="alert">{tr("No se pudo cargar la lista de distritos. ")}<button onClick={() => setIntento(i => i + 1)}>{tr("Reintentar")}</button></p>)}
        {tr(cargando && <div className="notice" role="status">{tr("Buscando información del clima…")}</div>)}
        {tr(error && <div className="notice error" role="alert">{tr(error)} <button onClick={() => setIntento(i => i + 1)}>{tr("Reintentar")}</button></div>)}
        {tr(datos && <article className="results">
          <div className="result-heading"><div><p className="eyebrow">{tr("INFORMACIÓN DE TU ZONA")}</p><h3>{tr(nombreLugar)}</h3></div><span className="date">{tr("Datos del ")}{tr(datos.fecha)}</span></div>
          <div className={`status ${datos.color}`}><span className="dot" /><div><strong>{tr(estados[datos.color][0])}</strong><p>{tr(estados[datos.color][1])}</p></div></div>
          <div className="metrics">
            <div><span>{tr("Temperatura media")}</span><strong>{tr(formato(datos.temperatura, '°C'))}</strong></div>
            <div><span>{tr("Temperatura mínima")}</span><strong>{tr(formato(datos.temperatura_minima, '°C'))}</strong></div>
            <div><span>{tr("Lluvia del día")}</span><strong>{tr(formato(datos.precipitacion, 'mm'))}</strong></div>
            <div><span>{tr("Humedad del aire")}</span><strong>{tr(formato(datos.humedad_relativa, '%'))}</strong></div>
          </div>
          <p className="explanation">{tr("El indicador compara la temperatura mínima del día mostrado: rojo ≤ 0 °C, amarillo ≤ 4 °C y verde > 4 °C. Es orientativo; no es un pronóstico ni una alerta oficial de helada.")}</p>
          <p className="source">{tr("Fuente: NASA POWER · Datos diarios estimados para una celda regional, no una medición de tu parcela. Pueden publicarse con retraso. La humedad mostrada es del aire, no del suelo.")}</p>
          <div className="next-actions"><a href="#pronostico">{tr("Ver próximos días →")}</a><a href="#siembras">{tr("Ver qué sembrar →")}</a></div>
        </article>)}
      </section>
      <MapaCampo lugares={lugares} distrito={distrito} nombreLugar={nombreLugar} setDistrito={setDistrito} mes={mesSiembra} setMes={setMesSiembra} ubicacion={ubicacion} solicitarUbicacion={solicitarUbicacion} setCultivoCalendario={setCultivoPlan} />
    </div>
    <div className="workspace-heading"><div><p className="eyebrow">{tr("02 / PLANIFICA TU CAMPAÑA")}</p><h2>{tr("¿Qué cultivar y cuándo sembrar?")}</h2></div><p>{tr("Consulta primero el calendario y después organiza la rotación.")}</p></div>
    <CalendarioAgricola distrito={distrito} setDistrito={setDistrito} lugares={lugares} mes={mesSiembra} setMes={setMesSiembra} cultivo={cultivoPlan} setCultivo={setCultivoPlan} />
    <Rotacion idioma={idioma} distrito={distrito} nombreLugar={nombreLugar} setCultivoCalendario={setCultivoPlan} />
    <Siembras distrito={distrito} nombreLugar={nombreLugar} lugares={lugares} setDistrito={setDistrito} mes={mesSiembra} setMes={setMesSiembra} />
    <details className="more-info"><summary>{tr("Consultar más detalles del clima")}</summary><p>{tr("Estos datos complementan el calendario. Revisa las fechas y fuentes.")}</p>
    <Calendario distrito={distrito} nombreLugar={nombreLugar} />
    <ClimaAnual distrito={distrito} nombreLugar={nombreLugar} />
    </details>
    <Asistente key={distrito} distrito={distrito} nombreLugar={nombreLugar} mes={mesSiembra} datos={datos?.distrito === distrito ? datos : null} idioma={idioma} />
    </main><footer className="app-footer"><strong>{tr("kultiv.IA")}</strong><span>{tr("Información para planificar tu campo · Junín y Ayacucho")}</span><a href="#clima">{tr("Volver a mi zona ↑")}</a></footer>
  </div>;
}
export default function App() {
  const {
    tr
  } = useTranslation();
  const [bienvenida, setBienvenida] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setBienvenida(false), 4000);
    return () => clearTimeout(timer);
  }, []);
  if (!bienvenida) return <Aplicacion />;
  return <main className="welcome-main-screen"><div className="welcome-main-content"><img className="welcome-main-logo" src={`${process.env.PUBLIC_URL}/logo-02.jpeg`} alt={tr("Logo kultiv.IA")} /><h1>{tr("¡Bienvenido a kultiv.IA!")}</h1><p role="status">{tr("Entrando a la aplicación…")}</p><video className="welcome-main-video" src={`${process.env.PUBLIC_URL}/mascota.webm`} autoPlay loop muted playsInline aria-hidden="true" /></div></main>;
}
