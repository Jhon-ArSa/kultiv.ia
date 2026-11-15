import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './locales/en.json';

const LanguageContext = createContext(null);
// Wanka is not enabled until a local speaker validates the full catalog.
// Do not expose unreliable machine translations of agronomic information.
const catalogs = { en };
const normalize = value => value.replace(/\s+/g, ' ').trim();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const indexes = Object.fromEntries(Object.entries(catalogs).map(([language, catalog]) => [language, {
  exact: new Map(Object.entries(catalog).map(([key, value]) => [normalize(key).toLocaleLowerCase('es'), value])),
  templates: Object.entries(catalog).filter(([key]) => /\{\d+\}/.test(key) && key.replace(/\{\d+\}/g, '').replace(/[^a-z]/gi, '').length >= 12)
    .map(([key, value]) => ({
      pattern: new RegExp('^' + key.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? '(.+?)' : escapeRegex(part)).join('') + '$', 'i'),
      slots: key.match(/\{\d+\}/g), value,
    })),
}]));

// Only display values pass through this function. API IDs, select values and
// saved crop names remain canonical, so switching language cannot change data.
export function translate(value, language, depth = 0) {
  if (Array.isArray(value)) return value.map(item => translate(item, language, depth));
  if (typeof value !== 'string' || language === 'es' || !indexes[language] || depth > 4) return value;
  const text = normalize(value);
  if (!text) return value;
  const index = indexes[language];
  let result = index.exact.get(text.toLocaleLowerCase('es'));
  if (!result) {
    for (const template of index.templates) {
      const match = text.match(template.pattern);
      if (!match) continue;
      result = template.value.replace(/\{\d+\}/g, slot => translate(match[template.slots.indexOf(slot) + 1], language, depth + 1));
      break;
    }
  }
  if (!result && /(?: → | y )/.test(text)) result = text.split(/( → | y )/).map(part => part === ' y ' ? (language === 'en' ? ' and ' : ' / ') : translate(part, language, depth + 1)).join('');
  if (!result && /^[-\d.,\s]+mm\/día$/.test(text)) result = text.replace('mm/día', language === 'en' ? 'mm/day' : 'mm/hunaynin');
  if (!result) return value;
  return (value.match(/^\s*/)?.[0] || '') + result + (value.match(/\s*$/)?.[0] || '');
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try { const saved = localStorage.getItem('raices-language'); return ['es', 'en'].includes(saved) ? saved : 'es'; } catch { return 'es'; }
  });
  useEffect(() => {
    document.documentElement.lang = language === 'qu' ? 'qu-x-wanka' : language;
    document.title = translate('kultiv.IA · Calendario y rotación de cultivos', language);
    try { localStorage.setItem('raices-language', language); } catch { /* Works without storage. */ }
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage: next => { if (['es', 'en'].includes(next)) setLanguage(next); } }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('LanguageProvider is required');
  return context;
}

export function useTranslation() {
  const { language } = useLanguage();
  return { tr: value => translate(value, language), locale: language === 'en' ? 'en-US' : 'es-PE' };
}
