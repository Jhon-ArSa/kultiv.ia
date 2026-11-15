import { apiFetch } from './api';
import { useTranslation, useLanguage } from "./i18n";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Calendario from './Calendario';
import Siembras from './Siembras';
import { referencias, regiones } from './zonas';
import Buscador from './Buscador';
import Asistente from './Asistente';
import CalendarioAgricola from './CalendarioAgricola';
import Rotacion from './Rotacion';
import ClimaAnual from './ClimaAnual';
import MapaCampo from './MapaCampo';
import NavigationRail from './NavigationRail';
import CanalLlamadas from './CanalLlamadas';
import ConversacionEjemplo from './ConversacionEjemplo';
import './Workspace.css';
import './Monochrome.css';
import './DesignSystem.css';
const formato = (valor, unidad) => `${Number(valor).toLocaleString('es-PE', {
  maximumFractionDigits: 1
})} ${unidad}`;
function Aplicacion() {
  const {
    tr
  } = useTranslation();
  const { language: idioma } = useLanguage();
  const pageFromPath = () => ({ '/': 'contenido-principal', '/clima': 'clima-anual', '/mapa': 'mapa-campo', '/calendario': 'calendario-agricola', '/rotacion': 'rotacion', '/cultivos': 'siembras', '/zona': 'clima', '/asistente': 'asistente', '/llamadas': 'llamadas', '/equipo': 'equipo' }[window.location.pathname] || 'contenido-principal');
  const [page, setPage] = useState(pageFromPath);
  const navigatePage = id => {
    const paths = { 'contenido-principal': '/', 'clima-anual': '/clima', 'mapa-campo': '/mapa', 'calendario-agricola': '/calendario', rotacion: '/rotacion', siembras: '/cultivos', clima: '/zona', asistente: '/asistente', llamadas: '/llamadas', equipo: '/equipo' };
    setPage(id);
    window.history.pushState({}, '', paths[id] || '/');
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (id === 'asistente') setTimeout(() => window.dispatchEvent(new Event('abrir-asistente')), 0);
  };
  useEffect(() => { const onPop = () => setPage(pageFromPath()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
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
  const [indicadores, setIndicadores] = useState(null);
  const [cargandoIndicadores, setCargandoIndicadores] = useState(true);
  const [errorIndicadores, setErrorIndicadores] = useState('');
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
        const respuesta = await apiFetch(`/ubicacion-cercana?${consulta}`);
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
    apiFetch('/distritos',  {
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
    let expirado = false;
    const limite = setTimeout(() => { expirado = true; controller.abort(); }, 40000);
    setCargando(true);
    setError('');
    setDatos(null);
    apiFetch(`/semaforo/${encodeURIComponent(distrito)}`,  {
      signal: controller.signal
    }).then(async r => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.detail);
      return body;
    }).then(setDatos).catch(e => {
      if (expirado) setError('La consulta climática tardó demasiado. Inténtalo de nuevo.');
      else if (e.name !== 'AbortError') setError(e.message || 'No se pudo conectar con el servidor.');
    }).finally(() => {
      clearTimeout(limite);
      if (!controller.signal.aborted || expirado) setCargando(false);
    });
    return () => { clearTimeout(limite); controller.abort(); };
  }, [distrito, intento]);
  useEffect(() => {
    const controller = new AbortController();
    let expirado = false;
    const limite = setTimeout(() => { expirado = true; controller.abort(); }, 45000);
    setIndicadores(null);
    setCargandoIndicadores(true);
    setErrorIndicadores('');
    apiFetch(`/indicadores-agricolas/${encodeURIComponent(distrito)}`,  { signal: controller.signal })
      .then(async respuesta => {
        const cuerpo = await respuesta.json();
        if (!respuesta.ok) throw new Error(cuerpo.detail);
        return cuerpo;
      })
      .then(setIndicadores)
      .catch(e => {
        if (expirado) setErrorIndicadores('La consulta de agua tardó demasiado. Inténtalo de nuevo.');
        else if (e.name !== 'AbortError') setErrorIndicadores(e.message || 'No se pudieron cargar los indicadores de agua.');
      }).finally(() => {
        clearTimeout(limite);
        if (!controller.signal.aborted || expirado) setCargandoIndicadores(false);
      });
    return () => { clearTimeout(limite); controller.abort(); };
  }, [distrito, intento]);
  const estados = {
    rojo: ['Temperatura bajo cero', 'La temperatura mínima estimada fue de 0 °C o menos.'],
    amarillo: ['Temperatura cercana a cero', 'La temperatura mínima estimada estuvo entre 0 y 4 °C.'],
    verde: ['Temperatura superior a 4 °C', 'La temperatura mínima estimada superó los 4 °C.']
  };
  const datosZona = datos?.distrito === distrito ? datos : null;
  const aguaZona = indicadores?.ubicacion === distrito ? indicadores : null;
  const valorClima = (valor, unidad) => datosZona ? (valor == null ? tr('Sin dato publicado') : formato(valor, unidad)) : tr(cargando ? 'Cargando…' : error ? 'Error al cargar' : 'Sin dato publicado');
  const valorAgua = (valor, unidad) => aguaZona ? (valor == null ? tr('Sin dato publicado') : formato(valor, unidad)) : tr(cargandoIndicadores ? 'Cargando…' : errorIndicadores ? 'Error al cargar' : 'Sin dato publicado');
  const integrantes = [
    { imagen: 'josbil.jpg', nombre: 'Josbil Gutierrez Tica', cargo: 'Civil Engineering - Web and communication development' },
    { imagen: 'frank.jpg', nombre: 'Frank Pierre Cardenas Quispe', cargo: 'Architect - Strategy and Solutions Lead' },
    { imagen: 'jhon.jpg', nombre: 'Jhon Edison Aroni Salazar', cargo: 'Systems engineer - Web development and UI/UX' },
    { imagen: 'yeral.jpg', nombre: 'Yerald Cristhian Sinche Alvaro', cargo: 'Systems engineer - Web design and development' },
    { imagen: 'Heidy.jpg', nombre: 'Heidy Diana Tocas Quiñones', cargo: 'Environmental Engineer - Product development and leadership' },
  ];
  return <div className="app" data-page={page}><NavigationRail page={page} onNavigate={navigatePage} />{idioma === 'qu' && <div className="language-warning" role="status">Quechua: traducción parcial y orientativa, pendiente de revisión por hablantes de quechua wanka de Junín. Los textos aún no traducidos aparecen en español.</div>}<svg className="mascot-filter-defs" aria-hidden="true"><filter id="quitar-blanco" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3" /></filter></svg><video className="dashboard-video" src={`${process.env.PUBLIC_URL}/campo-dashboard.mp4`} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" /><a className="skip-link" href="#clima">{tr("Ir a mi zona y mapa")}</a>
    <div className="dashboard-toolbar"><label>{tr("Distrito")}
      <select value={distrito} onChange={e => setDistrito(e.target.value)} disabled={!lugares.length}>
        {!lugares.length && <option value="Huancayo">Huancayo</option>}
        {lugares.map(l => <option key={l.nombre} value={l.nombre}>{l.etiqueta || l.nombre}</option>)}
      </select></label><label>{tr("Mes de siembra")}
      <select value={mesSiembra} onChange={e => setMesSiembra(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{tr(new Date(2024, i, 1).toLocaleDateString('es-PE', { month: 'long' }))}</option>)}</select>
      </label><div className="dashboard-data-status"><strong>{datosZona ? `${tr("Datos NASA del ")}${datosZona.fecha}` : tr(cargando ? "Buscando información del clima…" : error ? 'Error al cargar' : 'Sin dato publicado')}</strong><small>{tr("NASA POWER · estimación regional")}</small></div></div>
    <section className="welcome" aria-label={tr("Presentación de kultiv.IA")}><div className="welcome-copy"><p className="eyebrow">{tr("PLANIFICA LA ROTACIÓN DE TUS CULTIVOS")}</p><h1>kultiv.IA</h1><p>{tr("Organiza qué sembrar en cada campaña. Consulta el clima de tu zona y prepara un plan de rotación con orientación de la IA.")}</p><div className="hero-actions"><a className="hero-primary" href="/rotacion">{tr("Planear mi rotación")} <span aria-hidden="true">→</span></a><a className="hero-secondary" href="/llamadas"><span aria-hidden="true">☎</span> {tr("Conocer las llamadas con IA")}</a></div><div className="hero-call-note"><strong>{tr("También estamos desarrollando un canal por llamadas.")}</strong><span>{tr("Pensado para consultar hablando, desde un teléfono común. Explora la demostración; la línea telefónica aún no está habilitada.")}</span></div><a className="hero-video-link" href="/campo-dashboard.mp4" target="_blank" rel="noreferrer">{tr("Ver video")} ↗</a></div><div className="hero-mascot" aria-label={tr("Mascota de kultiv.IA")}><ConversacionEjemplo /><img src={`${process.env.PUBLIC_URL}/mujer-suave.webp`} alt={tr("Una agricultora conversa por teléfono")} /></div></section>
    <details className="guide-section" aria-label={tr("Conoce la aplicación")}><summary>{tr("¿Necesitas ayuda para usar la aplicación?")}</summary><p>{tr("Elige una opción para ver cómo usarla.")}</p><div className="guide-grid"><details><summary>{tr("🌦️ Conocer el tiempo")}</summary><p>{tr("Busca tu distrito o comunidad. Verás el último día disponible y podrás consultar los próximos días en el calendario. Revisa siempre la fecha.")}</p><a href="#clima">{tr("Buscar mi zona →")}</a></details><details><summary>{tr("🌱 Planear mis siembras")}</summary><p>{tr("Selecciona un mes para ver referencias de cultivos en tu región, sus necesidades y riesgos. La guía no confirma si una parcela es apta.")}</p><a href="#siembras">{tr("Ver siembras →")}</a></details><details><summary>{tr("Explorar mi zona")}</summary><p>{tr("Encuentra tu ubicación y cambia entre calles, imágenes satelitales y temperatura de la superficie.")}</p><a href="#mapa-campo">{tr("Explorar el mapa →")}</a></details><details><summary>{tr("💬 Pedir orientación")}</summary><p>{tr("Escribe una pregunta o elige una de las opciones. El asistente usa inteligencia artificial y no diagnostica el cultivo.")}</p><a href="#asistente">{tr("Hacer una pregunta →")}</a></details></div></details>
    <main id="contenido-principal"><section className="field-summary" aria-label={tr("Información de tu zona")}>
      <div className="field-summary-heading"><div><p className="eyebrow">{tr("Información de tu zona")}</p><h2>{tr(nombreLugar)}</h2></div><a href="#calendario-agricola">{tr("Ver calendario")}</a></div>
      {(error || errorIndicadores) && <div className="dashboard-load-error" role="alert"><span>{tr(error || errorIndicadores)}</span><button type="button" onClick={() => setIntento(valor => valor + 1)}>{tr('Reintentar')}</button></div>}
      <div className="field-summary-grid">
        <div><span aria-hidden="true">🌱</span><strong>{tr("¿Qué puedo sembrar?")}</strong><p>{referencias(distrito, mesSiembra).length ? tr(referencias(distrito, mesSiembra).join(' y ')) : tr("Aún no hay referencia")}</p><small>{tr("Referencia regional de siembra")} · {tr(new Date(2024, mesSiembra, 1).toLocaleDateString('es-PE', { month: 'long' }))}</small></div>
        <div><span aria-hidden="true">☀</span><strong>{tr("Temperatura media")}</strong><p>{valorClima(datosZona?.temperatura, '°C')}</p><small>{datosZona ? `${tr("Datos del ")}${datosZona.fecha}` : tr("NASA POWER · estimación regional")}</small></div>
        <div><span aria-hidden="true">🌧️</span><strong>{tr("Lluvia del día")}</strong><p>{valorClima(datosZona?.precipitacion, 'mm')}</p><small>{datosZona ? `${tr("Datos del ")}${datosZona.fecha}` : tr("NASA POWER · estimación regional")}</small></div>
        <div><span aria-hidden="true">🌡️</span><strong>{tr("Temperatura mínima")}</strong><p>{valorClima(datosZona?.temperatura_minima, '°C')}</p><small>{datosZona?.color ? tr(estados[datosZona.color][0]) : tr("NASA POWER · estimación regional")}</small></div>
        <div><span aria-hidden="true">◌</span><strong>{tr("Humedad del aire")}</strong><p>{valorClima(datosZona?.humedad_relativa, '%')}</p><small>{tr("No mide la humedad del suelo")}</small></div>
        <div><span aria-hidden="true">☀️</span><strong>{tr("Radiación solar")}</strong><p>{valorClima(datosZona?.radiacion_solar_mj_m2_dia, 'MJ/m²/día')}</p><small>{datosZona?.radiacion_solar_fecha ? `${tr('NASA POWER · ')}${datosZona.radiacion_solar_fecha}` : tr("NASA POWER · energía solar diaria estimada")}</small></div>
        <div><span aria-hidden="true">💧</span><strong>{tr("Humedad de la zona de raíces")}</strong><p>{aguaZona?.humedad_zona_raices != null ? `${Number(aguaZona.humedad_zona_raices).toLocaleString('es-PE', { maximumFractionDigits: 2 })} / 1` : valorAgua(null, '')}</p><small>{aguaZona ? `${tr("Modelo regional NASA POWER · ")}${aguaZona.fecha}` : tr("No es una medición de tu parcela")}</small></div>
        <div><span aria-hidden="true">🌤️</span><strong>{tr("Evaporación del terreno")}</strong><p>{valorAgua(aguaZona?.evaporacion_terrestre_mm, 'mm/día')}</p><small>{tr("Estimación regional; no es la demanda de riego del cultivo")}</small></div>
      </div><p className="field-summary-note">{tr("Datos climáticos históricos de NASA POWER para una zona amplia; no son una medición de tu parcela ni un pronóstico.")}</p>
    </section><ClimaAnual distrito={distrito} nombreLugar={nombreLugar} /><div className="workspace-heading"><div><p className="eyebrow">{tr("01 / EXPLORA TU ZONA")}</p><h2>{tr("Busca tu zona y mira el mapa")}</h2></div><span className="zone-badge">{tr("Zona: ")}{tr(nombreLugar)}</span></div><div className="layout" id="clima">
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
    </details>
    <section className="assistant-page-intro"><p className="eyebrow">{tr('ASISTENTE AGRÍCOLA')}</p><h1>{tr('Consulta sobre tu zona y tus cultivos')}</h1><p>{tr('Pregunta por clima, calendario, siembra o rotación. El asistente toma en cuenta los datos disponibles para la zona seleccionada.')}</p></section>

    <CanalLlamadas nombreLugar={nombreLugar} distrito={distrito} datos={datosZona} /></main>    <Asistente key={distrito} distrito={distrito} nombreLugar={nombreLugar} mes={mesSiembra} datos={datos?.distrito === distrito ? datos : null} indicadores={indicadores?.ubicacion === distrito ? indicadores : null} idioma={idioma} /><section className="team-page"><p className="eyebrow">{tr('EL EQUIPO')}</p><h1>{tr('Integrantes del proyecto')}</h1><p>{tr('Conoce a las personas que desarrollan kultiv.IA.')}</p><div className="team-grid">{integrantes.map(persona => <article className="team-card" key={persona.nombre}><img src={`${process.env.PUBLIC_URL}/integrantes/${persona.imagen}`} alt={persona.nombre} /><h2>{persona.nombre}</h2><p>{persona.cargo}</p></article>)}</div></section><footer className="app-footer"><strong>{tr("kultiv.IA")}</strong><span>{tr("Información para planificar tu campo · Junín y Ayacucho")}</span><button type="button" onClick={() => navigatePage('contenido-principal')}>{tr("Volver al inicio ↑")}</button></footer>
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

