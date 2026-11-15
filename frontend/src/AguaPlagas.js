import React, { useEffect, useState } from 'react';
const API = process.env.REACT_APP_API_URL || '/api';
export default function AguaPlagas({ distrito, nombreLugar }) {
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState('');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    const control = new AbortController(); setDatos(null); setEstado('Consultando datos de la NASA…');
    fetch(`${API}/indicadores-agricolas/${encodeURIComponent(distrito)}`, { signal: control.signal })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail); return d; })
      .then(d => { setDatos(d); setEstado(''); })
      .catch(e => { if (e.name !== 'AbortError') setEstado(e.message || 'No se pudo conectar con el servidor.'); });
    return () => control.abort();
  }, [distrito, intento]);
  const numero = v => Number(v).toLocaleString('es-PE', { maximumFractionDigits: 2 });
  return <section className="calendar-section agro-indicators" id="agua-plagas"><p className="eyebrow">INFORMACIÓN PARA TU CHACRA</p><h2>Agua y vigilancia del cultivo</h2><p>Datos estimados para <strong>{nombreLugar}</strong>. Ayudan a conocer la zona, pero no miden directamente tu parcela.</p>
    {estado && <p role="status">{estado} {estado !== 'Consultando datos de la NASA…' && <button type="button" onClick={() => setIntento(i => i + 1)}>Reintentar</button>}</p>}
    {datos && <div className="seguimiento-grid"><article className="forecast-card"><h3>💧 Agua en la zona</h3><p>Último día disponible: <strong>{datos.fecha}</strong></p><div className="metrics"><div><span>Humedad relativa estimada de la zona de raíces</span><strong>{numero(datos.humedad_zona_raices)} / 1</strong></div><div><span>Evaporación terrestre estimada</span><strong>{numero(datos.evaporacion_terrestre_mm)} mm/día</strong></div></div><p>La humedad es un índice de 0 a 1 de un modelo regional; no indica cuánta agua hay en tu suelo. La evaporación describe el terreno de la región, no el consumo ni la cantidad de riego de tu cultivo.</p><p className="space-warning">La demanda de agua de tu cultivo aún no está calculada. Para estimarla hacen falta el cultivo, su etapa, una evapotranspiración de referencia y otros datos de la parcela. ECOSTRESS todavía no tiene valores ESI ni evapotranspiración extraídos en esta aplicación.</p></article>
    <article className="forecast-card"><h3>🌿 Vigila tu cultivo</h3>{datos.semana ? <><p>Condiciones de los siete días del <strong>{datos.semana.inicio}</strong> al <strong>{datos.semana.fin}</strong>:</p><div className="metrics"><div><span>Lluvia acumulada</span><strong>{numero(datos.semana.lluvia_mm)} mm</strong></div><div><span>Humedad media del aire</span><strong>{numero(datos.semana.humedad_aire_media)} %</strong></div><div><span>Temperatura media</span><strong>{numero(datos.semana.temperatura_media)} °C</strong></div></div></> : <p>No hay siete días consecutivos completos; no se muestra un resumen parcial.</p>}<p>La humedad, la lluvia y la temperatura pueden influir en enfermedades como la rancha de la papa. Estos datos regionales no permiten predecir ni confirmar una plaga o enfermedad en tu parcela.</p><p>Revisa hojas y tallos, anota cambios y consulta los boletines oficiales o a un técnico local si observas daños.</p><a href="https://www.gob.pe/9945-pronosticos-agrometeorologicos-del-senamhi" target="_blank" rel="noreferrer">Ver boletines agrícolas de SENAMHI ↗</a></article></div>}
    <p className="source">Fuente: NASA POWER (GWETROOT, EVLAND y variables meteorológicas). Datos modelados para una celda regional y publicados con retraso. <a href="https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/" target="_blank" rel="noreferrer">Conoce los indicadores ↗</a></p>
  </section>;
}

