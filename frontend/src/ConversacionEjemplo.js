import React, { useEffect, useState } from 'react';
import { useTranslation } from './i18n';

export default function ConversacionEjemplo() {
  const { tr } = useTranslation();
  const pregunta = tr('¿Qué rotación de cultivos me recomiendas para mi zona?');
  const respuesta = tr('Cuéntame qué sembraste antes y si tienes agua para riego. Juntos revisaremos opciones para tu próxima campaña.');
  const [paso, setPaso] = useState(0);
  const [reducir, setReducir] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const cambiar = e => setReducir(e.matches);
    media?.addEventListener?.('change', cambiar);
    return () => media?.removeEventListener?.('change', cambiar);
  }, []);
  useEffect(() => {
    setPaso(0);
    if (reducir) return undefined;
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      setPaso(tick);
      if (tick >= pregunta.length + respuesta.length + 20) clearInterval(timer);
    }, 35);
    return () => clearInterval(timer);
  }, [pregunta, respuesta, reducir]);
  const preguntaVisible = reducir ? pregunta : pregunta.slice(0, paso);
  const respuestaVisible = reducir ? respuesta : respuesta.slice(0, Math.max(0, paso - pregunta.length - 16));
  const pensando = !reducir && paso >= pregunta.length && paso < pregunta.length + 16;

  return <div className="mascot-dialogue">
    <span className="mascot-dialogue-label">{tr('Una conversación de ejemplo')}</span>
    <div className="dialogue-content" aria-hidden="true">
      <p className="mascot-question">{preguntaVisible}<span className={paso < pregunta.length && !reducir ? 'typing-cursor' : ''} /></p>
      {(pensando || respuestaVisible) && <p className="mascot-answer"><strong>kultiv.IA:</strong> {pensando ? <span className="typing-dots"><i /><i /><i /></span> : respuestaVisible}{respuestaVisible && paso < pregunta.length + respuesta.length + 16 && !reducir ? <span className="typing-cursor" /> : null}</p>}
    </div>
    <span className="visually-hidden">{pregunta} kultiv.IA: {respuesta}</span>
  </div>;
}
