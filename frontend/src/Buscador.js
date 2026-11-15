import { useTranslation } from "./i18n";
import React, { useState } from 'react';
const API = process.env.REACT_APP_API_URL || '/api';
export default function Buscador({
  seleccionar
}) {
  const {
    tr
  } = useTranslation();
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [estado, setEstado] = useState('');
  const buscar = async e => {
    e.preventDefault();
    if (texto.trim().length < 2) {
      setEstado('Escribe al menos dos letras.');
      return;
    }
    setEstado('Buscando…');
    setResultados([]);
    try {
      const respuesta = await fetch(`${API}/buscar?q=${encodeURIComponent(texto.trim())}`);
      if (!respuesta.ok) throw new Error();
      const lista = await respuesta.json();
      setResultados(lista);
      setEstado(lista.length ? `Encontramos ${lista.length} opciones. Toca el nombre de tu zona en la lista.` : 'No encontramos esa zona. Revisa el nombre o prueba con el distrito más cercano.');
    } catch {
      setEstado('No se pudo realizar la búsqueda. Inténtalo de nuevo.');
    }
  };
  return <div className="search-location"><form onSubmit={buscar}><label htmlFor="buscar-lugar">{tr("Buscar distrito o centro poblado")}</label><div className="search-row"><input id="buscar-lugar" value={texto} onChange={e => setTexto(e.target.value)} placeholder={tr("Ej. Pilcomayo o nombre de comunidad")} /><button type="submit">{tr("Buscar")}</button></div></form><p className="search-hint">{tr("Junín y Ayacucho · Busca el nombre de tu comunidad, distrito o provincia. Las direcciones exactas no se buscan aquí.")}</p><p role="status" className="search-hint">{tr(estado)}</p>{tr(resultados.length > 0 && <ul className="search-results">{tr(resultados.map(u => <li key={u.id}><button onClick={() => {
          seleccionar(u);
          setResultados([]);
          setEstado('Ubicación seleccionada.');
        }}>{tr(u.nombre)} <small>{tr(u.tipo)} · {tr(u.distrito)}, {tr(u.provincia)}, {tr(u.region)} · {tr(u.id.slice(1))}</small></button></li>))}</ul>)}<p className="search-hint">{tr("Catálogo basado en INEI: ")}<a href="https://github.com/jmcastagnetto/ubigeo-peru-aumentado" target="_blank" rel="noreferrer">{tr("ubigeo-peru-aumentado")}</a>{tr(". Puede no incluir comunidades recientes o sin coordenadas.")}</p></div>;
}

