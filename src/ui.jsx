import { useState } from 'react';

export function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M20 3 A17 17 0 0 1 37 20" fill="none" stroke="#FFC21A" strokeWidth="3" strokeLinecap="round" />
      <text x="20" y="25" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="14" fill="currentColor">24</text>
    </svg>
  );
}

export function useTema() {
  const [tema, setTema] = useState(() => document.documentElement.dataset.tema || 'dark');
  const trocar = () => {
    const t = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.tema = t;
    try { localStorage.setItem('bar24-tema', t); } catch (e) { /* ignora */ }
    setTema(t);
  };
  return [tema, trocar];
}

export function TemaBtn({ className = 'btn sm ghost' }) {
  const [tema, trocar] = useTema();
  return (
    <button type="button" className={className} onClick={trocar} aria-label="Trocar tema claro/escuro" title="Trocar tema">
      {tema === 'dark'
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
      {tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
    </button>
  );
}

// Som de alerta (WebAudio, sem arquivo). Navegadores só liberam som depois do primeiro clique na página.
let audioCtx;
export function bip(freq = 880, dur = 0.18, vezes = 3) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    for (let k = 0; k < vezes; k++) {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.frequency.value = freq; o.type = 'square'; g.gain.value = 0.08;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + k * (dur + 0.1);
      o.start(t); o.stop(t + dur);
    }
  } catch (e) { /* sem áudio */ }
}


export function Modal({ titulo, onClose, children, largura = 520 }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: largura }}>
        <div className="row between"><h2>{titulo}</h2><button type="button" className="btn sm ghost" onClick={onClose} aria-label="Fechar">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export function Kpi({ label, value, sub, cls = '', subCls = 'muted' }) {
  return (
    <div className={'card kpi ' + cls}>
      <div className="label">{label}</div>
      <div className="value num">{value}</div>
      {sub ? <div className={'small ' + subCls}>{sub}</div> : null}
    </div>
  );
}
