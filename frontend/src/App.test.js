import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import Asistente from './Asistente';
import ChatTable from './ChatTable';
import { LanguageProvider, useLanguage, translate } from './i18n';
import en from './locales/en.json';
import source from './locales/source.json';

jest.mock('react-markdown', () => ({ children }) => <div>{children}</div>);
jest.mock('remark-gfm', () => () => {});
jest.mock('react-leaflet', () => ({
  MapContainer: ({children}) => <div>{children}</div>,
  TileLayer: () => null, WMSTileLayer: () => null,
  CircleMarker: ({children}) => <div>{children}</div>, Popup: ({children}) => <div>{children}</div>,
  useMap: () => ({setView: () => {},getZoom: () => 7,getCenter: () => [0,0]}),
}));

beforeEach(() => { localStorage.clear(); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
const ok = body => Promise.resolve({ok:true,json:async()=>body});
const weatherFetch = url => {
  if (url.includes('/distritos')) return ok([{nombre:'Huancayo',latitud:-12,longitud:-75}]);
  if (url.includes('/clima-anual')) return ok({ano:2025,meses:Array.from({length:12},(_,i)=>({mes:i+1,temperatura_c:14,minima_media_c:4,lluvia_mm_dia:2}))});
  if (url.includes('/pronostico')) return ok({dias:[{fecha:'2026-11-15',minima:3,maxima:18,lluvia_por_hora:[]}]});
  return ok({distrito:'Huancayo',color:'verde',fecha:'2026-11-10',temperatura:12,temperatura_minima:5,precipitacion:2,humedad_relativa:60});
};

test('switches the whole application and keeps canonical crop/location values', async () => {
  global.fetch=jest.fn(weatherFetch);
  jest.useFakeTimers();
  render(<LanguageProvider><App /></LanguageProvider>);
  await act(async()=>{jest.advanceTimersByTime(4000);});
  const selector=screen.getByRole('combobox',{name:/Idioma/});
  fireEvent.change(selector,{target:{value:'en'}});
  expect(await screen.findByText(translate('Busca tu zona y mira el mapa','en'))).toBeInTheDocument();
  for (const label of ['¿Cuándo puedo sembrar?','¿Qué sembrar después?','Tu zona y tus cultivos','Lluvia y temperatura durante el año']) {
    expect(screen.getByText(translate(label,'en'))).toBeInTheDocument();
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  }
  const crops=screen.getByRole('combobox',{name:translate('Cultivo','en')});
  expect(crops).toHaveValue('Papa');
  fireEvent.change(crops,{target:{value:'Maíz'}});
  expect(crops).toHaveValue('Maíz');
  expect(screen.getByRole('option',{name:translate('Quechua wanka (pendiente de validación)','en')})).toBeDisabled();
  expect(localStorage.getItem('raices-language')).toBe('en');
  expect(document.documentElement.lang).toBe('en');
  fireEvent.change(selector,{target:{value:'es'}});
  expect(screen.getByText('Busca tu zona y mira el mapa')).toBeInTheDocument();
});

test('catalogs cover the extracted UI and preserve template placeholders',()=>{
  for (const catalog of [en]) for (const key of source) {
    expect(typeof catalog[key]).toBe('string');
    expect(catalog[key].trim().length).toBeGreaterThan(0);
    expect((catalog[key].match(/\{\d+\}/g)||[]).sort()).toEqual((key.match(/\{\d+\}/g)||[]).sort());
  }
  expect(translate('Encontramos 8 opciones. Toca el nombre de tu zona en la lista.','en')).toContain('8');
  expect(translate('Huancayo · Junín','en')).toBe('Huancayo · Junín');
});

test('chat tables become labeled cards without losing forecast values',()=>{
  render(<ChatTable><thead><tr><th>Día</th><th>Lluvia</th></tr></thead><tbody><tr><td>15 noviembre</td><td>72% a las 18:00</td></tr></tbody></ChatTable>);
  expect(screen.getByText('Día').tagName).toBe('DT');
  expect(screen.getByText('15 noviembre').tagName).toBe('DD');
  expect(screen.getByText('72% a las 18:00')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

function ChatHarness() {
  const {language,setLanguage}=useLanguage();
  return <><button onClick={()=>setLanguage('en')}>Switch language</button><Asistente distrito="Huancayo" nombreLugar="Huancayo" idioma={language} mes={10} datos={null}/></>;
}
function openChat() {
  render(<LanguageProvider><ChatHarness /></LanguageProvider>);
  fireEvent.click(screen.getByRole('button',{name:'Pregúntame'}));
}
test('chat restores a failed question and sends it successfully on retry with context',async()=>{
  global.fetch=jest.fn().mockRejectedValueOnce(new TypeError('offline')).mockImplementationOnce(()=>ok({respuesta:'Revisa el calendario de tu zona.'}));
  openChat();
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'¿Qué puedo sembrar?'}});
  fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
  await screen.findByRole('alert');
  expect(screen.getByRole('textbox')).toHaveValue('¿Qué puedo sembrar?');
  fireEvent.click(screen.getByRole('button',{name:'Enviar'}));
  expect(await screen.findByText('Revisa el calendario de tu zona.')).toBeInTheDocument();
  const payload=JSON.parse(global.fetch.mock.calls[1][1].body);
  expect(payload.ubicacion).toBe('Huancayo');
  expect(payload.contexto.idioma_respuesta).toBe('es');
  expect(payload.mensajes).toHaveLength(1);
  expect(payload.contexto.fichas_cultivos).toHaveLength(4);
});

test('changing language aborts the old request and ignores its late response',async()=>{
  let resolve;
  global.fetch=jest.fn(()=>new Promise(r=>{resolve=r;}));
  openChat();
  fireEvent.click(screen.getByRole('button',{name:'¿Va a llover?'}));
  const signal=global.fetch.mock.calls[0][1].signal;
  fireEvent.click(screen.getByRole('button',{name:'Switch language'}));
  expect(signal.aborted).toBe(true);
  await act(async()=>{resolve({ok:true,json:async()=>({respuesta:'Respuesta vieja'})});});
  expect(screen.queryByText('Respuesta vieja')).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:translate('Enviar','en')})).toBeInTheDocument();
});

test('chat times out, restores the question and unlocks sending',async()=>{
  jest.useFakeTimers();
  global.fetch=jest.fn((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')))));
  openChat();
  fireEvent.click(screen.getByRole('button',{name:'¿Va a llover?'}));
  await act(async()=>{jest.advanceTimersByTime(75000);});
  expect(screen.getByRole('alert')).toHaveTextContent('tardó demasiado');
  expect(screen.getByRole('textbox')).toHaveValue('¿Va a llover en mi zona?');
  expect(screen.getByRole('button',{name:'Enviar'})).not.toBeDisabled();
});
