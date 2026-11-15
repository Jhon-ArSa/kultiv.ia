import { apiFetch } from './api';
import { useTranslation } from "./i18n";
import React, { useEffect, useRef, useState } from 'react';
const textos = {
  es: {
    eyebrow: 'PLANIFICA TU CHACRA',
    title: '¿Qué sembrar después?',
    intro: 'Organiza tus cultivos para las próximas campañas. Cambiar de cultivo puede ayudar a cuidar el suelo.',
    season: 'Campaña',
    select: 'Elige un cultivo',
    save: 'Guardar mi plan',
    saved: 'Plan guardado en este navegador.',
    fail: 'No se pudo guardar el plan.',
    advice: 'Alternar familias de cultivos puede ayudar a manejar plagas y conservar el suelo. Comprueba el agua, las fechas de siembra y el mercado con un técnico local antes de decidir.',
    repeat: 'Hay cultivos de la misma familia en campañas consecutivas. Revisa esta secuencia con un técnico.',
    empty: 'Completa las campañas para revisar la secuencia.',
    different: 'Las familias elegidas son diferentes entre campañas consecutivas. Esto no confirma la aptitud del plan para tu parcela.',
    prior: 'Este plan fue guardado para',
    newzone: 'Revisa el plan antes de guardarlo para la zona actual.',
    source: 'Guía de rotación de la FAO',
    local: 'Tu plan se guarda solo en este navegador y dispositivo.'
  }
};
const opciones = [{
  id: 'papa',
  nombres: ['Papa', 'Potato', 'Papa'],
  familia: 'solanacea'
}, {
  id: 'maiz',
  nombres: ['Maíz', 'Maize', 'Sara'],
  familia: 'graminea'
}, {
  id: 'haba',
  nombres: ['Haba', 'Broad bean', 'Hawas'],
  familia: 'leguminosa'
}, {
  id: 'quinua',
  nombres: ['Quinua', 'Quinoa', 'Kinwa'],
  familia: 'amarantacea'
}];
const key = 'raices-rotacion-v1';
function leer() {
  try {
    const d = JSON.parse(localStorage.getItem(key));
    return d && Array.isArray(d.cultivos) && d.cultivos.length === 4 ? d : null;
  } catch {
    return null;
  }
}
export default function Rotacion({
  idioma,
  distrito,
  nombreLugar,
  setCultivoCalendario
}) {
  const {
    tr
  } = useTranslation();
  const t = textos.es,
    pos = 0;
  const [inicial] = useState(leer);
  const [plan, setPlan] = useState(inicial?.distrito === distrito ? inicial.cultivos : ['', '', '', '']);
  const [zonaGuardada, setZonaGuardada] = useState(inicial?.distrito || '');
  const [nombreGuardado, setNombreGuardado] = useState(inicial?.nombre || '');
  const [mensaje, setMensaje] = useState('');
  const anoInicio = inicial?.distrito === distrito && inicial?.anoInicio ? Number(inicial.anoInicio) : new Date().getFullYear();
  const [propuesta, setPropuesta] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [errorIA, setErrorIA] = useState('');
  const solicitud = useRef(null);
  const zonaAnterior = useRef(distrito);
  useEffect(() => {
    setPropuesta(null);
    setErrorIA('');
    setGenerando(false);
    if (zonaAnterior.current !== distrito) {
      setPlan(['', '', '', '']);
      setMensaje('');
      zonaAnterior.current = distrito;
    }
    return () => {
      solicitud.current?.abort();
      solicitud.current = null;
    };
  }, [distrito, idioma]);
  const invalidar = () => {
    solicitud.current?.abort();
    solicitud.current = null;
    setGenerando(false);
    setPropuesta(null);
    setErrorIA('');
  };
  const familias = plan.map(id => opciones.find(x => x.id === id)?.familia);
  const completa = familias.every(Boolean);
  const repetida = familias.some((f, i) => i > 0 && f && f === familias[i - 1]);
  const guardar = () => {
    try {
      localStorage.setItem(key, JSON.stringify({
        distrito,
        nombre: nombreLugar,
        cultivos: plan,
        anoInicio
      }));
      window.dispatchEvent(new Event('rotacion-guardada'));
      setZonaGuardada(distrito);
      setNombreGuardado(nombreLugar);
      setMensaje(t.saved);
    } catch {
      setMensaje(t.fail);
    }
  };
  const generar = async () => {
    if (!Number.isInteger(Number(anoInicio)) || Number(anoInicio) < 2000 || Number(anoInicio) > 2097) {
      setErrorIA('Elige un año de inicio entre 2000 y 2097.');
      return;
    }
    solicitud.current?.abort();
    const controller = new AbortController();
    solicitud.current = controller;
    setGenerando(true);
    setErrorIA('');
    setPropuesta(null);
    try {
      const r = await apiFetch('/rotacion',  {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          ubicacion: distrito,
          ano_inicio: Number(anoInicio),
          idioma
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : 'No se pudo generar la propuesta.');
      if (!controller.signal.aborted) {
        setPlan(d.cultivos);
        setPropuesta(d);
        setMensaje('');
      }
    } catch (e) {
      if (e.name !== 'AbortError') setErrorIA(e.message || 'No se pudo conectar con el servidor.');
    } finally {
      if (solicitud.current === controller) {
        solicitud.current = null;
        setGenerando(false);
      }
    }
  };
  return <section className="calendar-section rotacion" id="rotacion">
    <div className="rotation-heading"><div><p className="eyebrow">{tr(t.eyebrow)}{tr(" / PLAN CON IA")}</p><h2>{tr(t.title)}</h2><p>{tr(t.intro)}</p></div><span className="rotation-zone">{tr(nombreLugar)}</span></div>
    {tr(zonaGuardada && zonaGuardada !== distrito && <p className="space-warning">{tr(t.prior)}: {tr(nombreGuardado)}. {tr(t.newzone)}</p>)}
    <div className="rotation-intro"><div><span className="rotation-number">01</span><div><strong>{tr("Prepara un plan para tu zona")}</strong><p>{tr("Usaremos la zona seleccionada, las referencias regionales y los datos NASA disponibles.")}</p></div></div></div>
    <div className="rotation-generate"><button className="primary-action" type="button" disabled={generando} onClick={generar}>{tr(generando ? 'Consultando datos y preparando propuesta…' : 'Generar rotación para mi zona →')}</button><p>{tr("Al generar, se envían a Groq la zona y los datos regionales de NASA POWER. No se envían las coordenadas GPS.")}</p></div>
    {tr(errorIA && <p className="space-warning" role="alert">{tr(errorIA)}</p>)}
    <div className="rotation-intro rotation-step"><div><span className="rotation-number">02</span><div><strong>{tr("Revisa tu plan de cuatro campañas")}</strong><p>{tr("Puedes cambiar cualquier cultivo antes de guardar el plan.")}</p></div></div></div>
    <div className="rotation-grid">{tr(plan.map((id, i) => <label className="rotation-card" key={i}><strong>{tr(t.season)} {tr(i + 1)}</strong><select value={id} onChange={e => {
          invalidar();
          const copia = [...plan];
          copia[i] = e.target.value;
          setPlan(copia);
          setMensaje('');
        }}><option value="">{tr(t.select)}</option>{tr(opciones.map(o => <option key={o.id} value={o.id}>{tr(o.nombres[pos])}</option>))}</select></label>))}</div>
    {tr(plan.some(Boolean) && <div className="rotation-calendar-links"><strong>{tr("Consultar un cultivo del plan:")}</strong>{tr([...new Set(plan.filter(Boolean))].map(id => {
        const opcion = opciones.find(o => o.id === id);
        return opcion && <a key={id} href="#calendario-agricola" onClick={() => setCultivoCalendario(opcion.nombres[0])}>{tr(opcion.nombres[0])}{tr(" en el calendario →")}</a>;
      }))}</div>)}
    <p className="rotation-advice" role="status">{tr(repetida ? t.repeat : completa ? t.different : t.empty)}</p>
    {tr(propuesta && <div className="rotation-result"><h3>{tr("Por qué considerar esta secuencia")}</h3><p>{tr(propuesta.explicacion)}</p><strong>{tr("Antes de decidir, revisa:")}</strong><ul>{tr(propuesta.comprobar.map((item, i) => <li key={i}>{tr(item)}</li>))}</ul><p className="source">{tr("Datos usados: ")}{tr(propuesta.datos_usados.diario ? `NASA POWER diario del ${propuesta.datos_usados.diario.fecha}` : 'sin datos diarios')}; {tr(propuesta.datos_usados.ano_historico ? `historial mensual de ${propuesta.datos_usados.ano_historico} (${propuesta.datos_usados.meses_disponibles} meses disponibles)` : 'sin historial mensual')}{tr(". También se usaron las referencias regionales disponibles.")}</p></div>)}
    <p>{tr(t.advice)}</p><p className="source">{tr("La IA puede equivocarse. Los datos de NASA POWER representan una celda regional y el historial no predice el clima futuro. La ubicación no revela por sí sola el cultivo anterior, el tipo de suelo ni la disponibilidad real de riego. Consulta a un técnico antes de tomar decisiones.")}</p>
    <button className="primary-action" type="button" onClick={guardar}>{tr(t.save)}</button> <span role="status">{tr(mensaje)}</span><p className="source">{tr(t.local)} <a href="https://www.fao.org/4/a0218e/A0218E16.htm" target="_blank" rel="noreferrer">{tr(t.source)} ↗</a></p>
  </section>;
}

