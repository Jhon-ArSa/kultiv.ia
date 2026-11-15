import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';

const fechaUTC = () => new Date().toISOString().slice(0, 10);
export default function MapaTemperatura() {
  const [fecha, setFecha] = useState(fechaUTC);
  const [error, setError] = useState(false);
  const base = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default';
  const url = `${base}/${fecha}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;
  const worldview = `https://worldview.earthdata.nasa.gov/?v=-104.1903246340216,-22.555704195083727,-51.17008538365111,2.6427168028137&l=Reference_Labels_15m,DoS_International_Boundaries,Coastlines_15m,MODIS_Terra_Land_Surface_Temp_Day&lg=false&t=${fecha}`;
  return <section className="calendar-section mapa-temperatura" id="mapa-temperatura"><p className="eyebrow">MAPA DE LA NASA</p><h2>Temperatura de la superficie</h2><p>Explora el Perú y las zonas vecinas con la misma capa del mapa de NASA Worldview. Selecciona un día para consultar sus imágenes.</p>
    <div className="temp-map-controls"><label htmlFor="fecha-temp">Fecha de la imagen <input id="fecha-temp" type="date" min="2000-02-24" max={fechaUTC()} value={fecha} onChange={e => { if (e.target.value) { setError(false); setFecha(e.target.value); } }} /></label><a href={worldview} target="_blank" rel="noreferrer">Abrir en NASA Worldview ↗</a></div>
    <div className="temperature-map"><MapContainer center={[-9.2,-75.3]} zoom={5} minZoom={3} maxZoom={9} scrollWheelZoom={false} aria-label="Mapa NASA de temperatura de superficie"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><TileLayer key={fecha} url={url} maxNativeZoom={7} opacity={0.85} attribution='Imágenes: NASA GIBS / MODIS Terra' eventHandlers={{ tileerror: () => setError(true) }} /></MapContainer></div>
    {error && <p role="alert">No se pudo cargar parte del mapa de la NASA. Comprueba tu conexión o intenta otra fecha.</p>}
    <div className="temp-legend"><strong>Escala de temperatura de la superficie</strong><img src="https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg" alt="Leyenda oficial NASA de temperatura de superficie en kelvin" /><p>La escala de NASA está en kelvin (K): para convertir a grados Celsius, resta 273,15. Por ejemplo, 300 K equivalen a 26,85 °C. Donde se vea solo el mapa base no hay datos visibles; puede haber nubes o falta de cobertura.</p></div>
    <p className="source">Fecha solicitada: {fecha} (UTC). Las imágenes pueden tardar en publicarse; una fecha seleccionada no garantiza cobertura. Esta capa muestra temperatura de la superficie durante el paso del satélite, no temperatura del aire ni un pronóstico. Fuente: NASA GIBS, MODIS/Terra.</p>
  </section>;
}
