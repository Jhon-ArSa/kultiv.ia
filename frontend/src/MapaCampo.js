import { useTranslation } from "./i18n";
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { referencias, regiones } from './zonas';
import { cultivos } from './Siembras';
const hoy = () => new Date().toISOString().slice(0, 10);
const fechaAnterior = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
};
const mesNombre = mes => new Date(2024, mes, 1).toLocaleDateString('es-PE', {
  month: 'long'
});
function Encuadre({
  lugar,
  ubicacion,
  vista,
  encuadre
}) {
  const mapa = useMap();
  useEffect(() => {
    if (lugar) mapa.setView([lugar.latitud, lugar.longitud], 10);
  }, [mapa, lugar]);
  useEffect(() => {
    if (ubicacion) mapa.setView([ubicacion.latitud, ubicacion.longitud], 16);
  }, [mapa, ubicacion]);
  useEffect(() => {
    if (vista === 'temperatura') mapa.setView(mapa.getCenter(), Math.min(mapa.getZoom(), 7));
  }, [mapa, vista]);
  useEffect(() => {
    if (encuadre) mapa.setView([-9.2, -75.3], 5);
  }, [mapa, encuadre]);
  return null;
}
export default function MapaCampo({
  lugares,
  distrito,
  nombreLugar,
  setDistrito,
  mes,
  setMes,
  ubicacion,
  solicitarUbicacion,
  setCultivoCalendario
}) {
  const {
    tr
  } = useTranslation();
  const [vista, setVista] = useState('calles');
  const [fecha, setFecha] = useState(() => fechaAnterior(hoy(), 2));
  const [error, setError] = useState(false);
  const [encuadre, setEncuadre] = useState(0);
  const [mostrarSiembras, setMostrarSiembras] = useState(true);
  const [planGuardado, setPlanGuardado] = useState(null);
  useEffect(() => {
    const leer = () => {
      try {
        const plan = JSON.parse(localStorage.getItem('raices-rotacion-v1') || 'null');
        setPlanGuardado(plan && Array.isArray(plan.cultivos) ? plan : null);
      } catch {
        setPlanGuardado(null);
      }
    };
    leer();
    window.addEventListener('rotacion-guardada', leer);
    window.addEventListener('storage', leer);
    return () => {
      window.removeEventListener('rotacion-guardada', leer);
      window.removeEventListener('storage', leer);
    };
  }, []);
  const temperatura = vista === 'temperatura';
  const cambiarVista = valor => {
    setError(false);
    setVista(valor);
  };
  const worldview = `https://worldview.earthdata.nasa.gov/?v=-82,-19,-68,1&l=Reference_Labels_15m,DoS_International_Boundaries,Coastlines_15m,MODIS_Terra_L3_Land_Surface_Temp_Daily_Day&lg=false&t=${fecha}`;
  const referenciasZona = referencias(distrito, mes);
  const nombresPlan = {
    papa: 'Papa',
    maiz: 'Maíz',
    haba: 'Haba',
    quinua: 'Quinua'
  };
  const cultivosPlan = planGuardado?.distrito === distrito ? planGuardado.cultivos.map(c => nombresPlan[c]).filter(Boolean) : [];
  return <section className="field-map" id="mapa-campo" aria-label={tr("Mapa integrado de tu zona")}>
    <header className="field-map-heading"><div><p className="eyebrow">{tr("EXPLORA TU CHACRA")}</p><h2>{tr("Tu zona y tus cultivos")}</h2><p className="field-map-subtitle">{tr("Cambia de vista y toca un punto para consultar la zona.")}</p></div><button type="button" onClick={() => setEncuadre(n => n + 1)}>{tr("Ver todo el Perú")}</button></header>
    <div className="field-map-toolbar">
      <div className="map-modes" role="group" aria-label={tr("Tipo de mapa")}>{tr([['calles', 'Calles'], ['satelite', 'Satélite'], ['temperatura', 'Temperatura NASA']].map(([valor, texto]) => <button key={valor} type="button" aria-pressed={vista === valor} onClick={() => cambiarVista(valor)}>{tr(texto)}</button>))}</div>
      <button type="button" onClick={solicitarUbicacion}>{tr("Mi ubicación")}</button>
    </div>
    <div className="field-map-filters"><label>{tr("Mes de siembra")}<select value={mes} onChange={e => setMes(Number(e.target.value))}>{tr(Array.from({
            length: 12
          }, (_, i) => <option key={i} value={i}>{tr(mesNombre(i))}</option>))}</select></label><label className="map-checkbox"><input type="checkbox" checked={mostrarSiembras} onChange={e => setMostrarSiembras(e.target.checked)} />{tr(" Mostrar zonas de siembra")}</label>{tr(temperatura && <><label>{tr("Fecha de imagen (UTC)")}<input type="date" min="2000-02-25" max={hoy()} value={fecha} onChange={e => {
            const valor = e.target.value;
            if (valor && valor >= '2000-02-25' && valor <= hoy()) {
              setFecha(valor);
              setError(false);
            }
          }} /></label><button type="button" disabled={fecha <= '2000-02-25'} onClick={() => {
          setFecha(fechaAnterior(fecha, 1));
          setError(false);
        }}>{tr("← Día anterior")}</button></>)}</div>
    <div className="field-map-canvas"><MapContainer center={[-12.55, -74.9]} zoom={7} maxZoom={19} minZoom={3} scrollWheelZoom={false}>
      <Encuadre lugar={lugares.find(l => l.nombre === distrito)} ubicacion={ubicacion} vista={vista} encuadre={encuadre} />
      <TileLayer key={vista === 'satelite' ? 'satelite' : 'calles'} maxZoom={19} maxNativeZoom={19} attribution={vista === 'satelite' ? 'Imágenes: Esri, Vantor, Earthstar Geographics y comunidad GIS' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'} url={vista === 'satelite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} eventHandlers={{
          tileerror: () => setError(true)
        }} />
      {tr(temperatura && <WMSTileLayer key={fecha} url="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi" layers="MODIS_Terra_L3_Land_Surface_Temp_Daily_Day" format="image/png" transparent time={fecha} maxNativeZoom={7} maxZoom={19} opacity={1} attribution="NASA GIBS / MODIS Terra MOD11A1" eventHandlers={{
          tileerror: () => setError(true)
        }} />)}
      {tr(ubicacion && <CircleMarker center={[ubicacion.latitud, ubicacion.longitud]} radius={10} pathOptions={{
          color: '#fff',
          fillColor: '#1975d1',
          fillOpacity: 1
        }}><Popup>{tr("Tu ubicación aproximada (± ")}{tr(Math.round(ubicacion.precision))}{tr(" m). El clima corresponde a la zona seleccionada, no al GPS.")}</Popup></CircleMarker>)}
      {tr(mostrarSiembras && lugares.map(l => {
          const referenciasMes = referencias(l.nombre, mes);
          return <CircleMarker key={l.nombre} center={[l.latitud, l.longitud]} radius={l.nombre === distrito ? 10 : 7} pathOptions={{
            color: l.nombre === distrito ? '#152f26' : '#fff',
            weight: l.nombre === distrito ? 3 : 2,
            fillColor: referenciasMes.length ? '#c67b1b' : '#64786c',
            fillOpacity: 1
          }} eventHandlers={{
            click: () => setDistrito(l.nombre)
          }}><Popup maxWidth={320} className="sowing-popup"><strong>{tr(l.etiqueta || l.nombre)} · {tr(regiones[l.nombre])}</strong><p>{tr("Siembras en ")}{tr(mesNombre(mes))}</p>{tr(referenciasMes.length ? cultivos.filter(c => referenciasMes.includes(c.nombre)).map(c => <div className="popup-crop" key={c.nombre}><strong>{tr(c.nombre)}</strong><p><b>{tr("Referencia:")}</b> {tr(c.periodo)}</p><p><b>{tr("Factores:")}</b> {tr(c.factores)}</p><p><b>{tr("Riesgos:")}</b> {tr(c.riesgos)}</p></div>) : <p>{tr("Sin ventana documentada para este mes. Esto no significa que no se pueda sembrar.")}</p>)}<p>{tr("Referencia regional; no evalúa tu parcela.")}</p><a href="#calendario-agricola">{tr("Ver calendario agrícola →")}</a></Popup></CircleMarker>;
        }))}
    </MapContainer></div>
    <div className="map-crop-overview"><div><p className="eyebrow">{tr("ZONA SELECCIONADA")}</p><h3>{tr(nombreLugar)}</h3><p><strong>{tr("Para ")}{tr(mesNombre(mes))}:</strong> {tr(referenciasZona.length ? `la guía tiene referencias regionales de siembra para ${referenciasZona.join(' y ')}.` : 'la guía aún no tiene referencias de siembra para este mes.')}</p><p className="map-crop-disclaimer">{tr("Son referencias regionales; no confirman qué cultivar en tu parcela.")}</p><div className="map-crop-links">{tr(referenciasZona.map(nombre => <a key={nombre} href="#calendario-agricola" onClick={() => setCultivoCalendario(nombre)}>{tr("Ver ")}{tr(nombre)}{tr(" en el calendario →")}</a>))}<a href="#calendario-agricola">{tr("Ver calendario")}</a></div></div><div className="map-rotation-summary"><span>{tr("MI ROTACIÓN GUARDADA")}</span>{tr(cultivosPlan.length ? <><strong>{tr(cultivosPlan.join(' → '))}</strong><small>{tr("Campañas guardadas en este navegador. Revisa las fechas en tu plan.")}</small></> : <><strong>{tr("Todavía no tienes un plan para esta zona")}</strong><small>{tr("Crea una propuesta con ayuda de IA y revísala antes de decidir.")}</small></>)}<a href="#rotacion">{tr(cultivosPlan.length ? 'Revisar mi plan →' : 'Preparar mi rotación →')}</a></div></div>
    <div className="field-map-details">
      {tr(error && <p className="error" role="alert">{tr("No se pudieron cargar algunas imágenes. Revisa la conexión o cambia de vista o fecha.")}</p>)}
      {tr(mostrarSiembras && <div className="map-key"><span><i className="legend-dot has-reference" />{tr(" Con referencia de siembra")}</span><span><i className="legend-dot no-reference" />{tr(" Sin referencia en la guía")}</span><span>{tr("Borde oscuro: zona elegida")}</span></div>)}
      {tr(temperatura ? <><div className="field-temperature-legend"><div><p className="eyebrow">{tr("APRENDE A LEER EL MAPA")}</p><h3>{tr("¿Qué significan los colores?")}</h3><p>{tr("Los colores muestran qué tan caliente o fría estaba la superficie de la tierra cuando pasó el satélite. Busca el color en la barra y compáralo con las temperaturas de abajo.")}</p></div>
        <div className="temperature-scale"><img src="https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg" alt={tr("Escala de NASA: los colores pasan de morado y azul para temperaturas más bajas a amarillo, naranja y rojo para temperaturas más altas. Las cifras originales están en kelvin.")} /><p>{tr("La barra original de NASA usa kelvin. Estos son valores aproximados convertidos a grados Celsius:")}</p><div className="temperature-examples"><div><span className="temp-swatch temp-purple" /><strong>{tr("Morado")}</strong><span>{tr("cerca de −73 °C o menos")}</span></div><div><span className="temp-swatch temp-blue" /><strong>{tr("Azul")}</strong><span>{tr("alrededor de −43 °C")}</span></div><div><span className="temp-swatch temp-cyan" /><strong>{tr("Celeste")}</strong><span>{tr("alrededor de −13 °C")}</span></div><div><span className="temp-swatch temp-green" /><strong>{tr("Verde")}</strong><span>{tr("alrededor de 2 °C")}</span></div><div><span className="temp-swatch temp-yellow" /><strong>{tr("Amarillo")}</strong><span>{tr("alrededor de 17 °C")}</span></div><div><span className="temp-swatch temp-orange" /><strong>{tr("Naranja")}</strong><span>{tr("alrededor de 47 °C")}</span></div><div><span className="temp-swatch temp-red" /><strong>{tr("Rojo")}</strong><span>{tr("cerca de 77 °C o más")}</span></div></div><p className="temperature-note">{tr("Son puntos de referencia de la escala, no una medición exacta al tocar el mapa. Un color puede representar temperaturas intermedias.")}</p></div>
        <div className="temperature-help"><strong>{tr("Si ves el mapa normal, franjas o zonas sin color")}</strong><p>{tr("Puede que no haya una imagen válida para esa zona y fecha, por nubes, cobertura o publicación pendiente. La capa diaria reúne observaciones disponibles, pero no garantiza cobertura completa. Los colores del mapa base no representan temperatura. Prueba con el botón «Día anterior» o abre el mapa oficial.")}</p></div>
        <p><strong>{tr("Para tu chacra:")}</strong>{tr(" esta imagen no indica la temperatura del aire ni dice por sí sola si habrá helada o si un cultivo es apto. Consulta también el pronóstico y el calendario agrícola.")}</p><div className="temperature-actions"><a href="#pronostico">{tr("Ver pronóstico →")}</a><a href="#calendario-agricola">{tr("Ver calendario agrícola →")}</a></div></div><p className="source">{tr("Fecha solicitada: ")}{tr(fecha)}{tr(" (UTC). Puede haber nubes, falta de cobertura o retrasos de publicación. Es temperatura de la superficie durante el paso del satélite, no del aire ni un pronóstico. Al acercarte amplías la imagen disponible; no obtienes detalle de tu parcela.")}</p><a href={worldview} target="_blank" rel="noreferrer">{tr("Consultar en NASA Worldview ↗")}</a></> : <p className="source">{tr(vista === 'satelite' ? 'Imágenes de Esri: su fecha y resolución varían por zona; no son imágenes en vivo.' : 'Toca una zona para consultar sus referencias de siembra. Usa + y − para acercarte o alejarte.')}</p>)}
    </div>
  </section>;
}
