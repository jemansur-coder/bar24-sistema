import { createContext, useContext, useEffect, useState } from 'react';
import { setOperadorAtual, useStore } from './store.jsx';
import { Logo, TemaBtn } from './ui.jsx';
import { PAPEIS } from './seed.js';

// Login do funcionário por PIN. Cada aparelho (caixa, tablet, cozinha) guarda quem está usando.
// Tudo o que for lançado, cancelado ou recebido fica com o nome dessa pessoa.

const CHAVE = 'bar24-operador';
const ler = () => { try { return localStorage.getItem(CHAVE) || ''; } catch (e) { return ''; } };
const gravar = (v) => { try { v ? localStorage.setItem(CHAVE, v) : localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ } };

// telas que cada papel vê ('' = dashboard)
export const PERMISSOES = {
  Dono: '*',
  Gerente: '*',
  Caixa: ['', 'caixa', 'salao', 'turno', 'garcom', 'cozinha', 'jogos', 'parede', 'qrcodes', 'clientes'],
  'Garçom': ['garcom', 'salao', 'jogos'],
  Cozinha: ['cozinha'],
  Estoquista: ['estoque', 'fornecedores', 'produtos'],
};
export const podeVer = (u, rota) => !!u && (PERMISSOES[u.papel] === '*' || (PERMISSOES[u.papel] || []).includes(rota));
export const inicial = (u) => (PERMISSOES[u?.papel] === '*' ? '' : (PERMISSOES[u?.papel] || [''])[0]);

const Ctx = createContext(null);

export function OperadorProvider({ children }) {
  const { s } = useStore();
  const [id, setId] = useState(ler);
  const usuario = s.usuarios.find((u) => u.id === id && u.ativo) || null;
  setOperadorAtual(usuario);
  useEffect(() => {
    const on = (e) => { if (e.key === CHAVE) setId(e.newValue || ''); };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);
  const entrar = (uid) => { gravar(uid); setId(uid); };
  const sair = () => { gravar(''); setId(''); };
  return <Ctx.Provider value={{ usuario, entrar, sair }}>{children}</Ctx.Provider>;
}

export const useOperador = () => useContext(Ctx);

const cor = (nome) => ['#FFC21A', '#4EA8FF', '#34C77B', '#FF8A5B', '#C084FC', '#F472B6'][[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % 6];

export function Avatar({ u, tamanho = 44 }) {
  return (
    <span aria-hidden="true" style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, background: cor(u.nome), color: '#111', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: tamanho * 0.42, flex: 'none', fontFamily: "'Space Grotesk', sans-serif" }}>
      {u.nome.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function TelaPin({ onEntrar, titulo = 'Quem está usando?' }) {
  const { s } = useStore();
  const ordem = (u) => { const k = PAPEIS.indexOf(u.papel); return k < 0 ? 99 : k; };
  const ativos = s.usuarios.filter((u) => u.ativo).sort((a, b) => ordem(a) - ordem(b) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const [sel, setSel] = useState(null);
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const digitar = (k) => {
    if (k === 'apagar') { setPin(pin.slice(0, -1)); setErro(''); return; }
    const novo = (pin + k).slice(0, 4);
    setPin(novo); setErro('');
    if (novo.length === 4) {
      if (novo === sel.pin) { onEntrar(sel.id); }
      else { setErro('PIN errado. Tente de novo.'); setTimeout(() => setPin(''), 350); }
    }
  };
  useEffect(() => {
    if (!sel) return;
    const on = (e) => { if (/^\d$/.test(e.key)) digitar(e.key); else if (e.key === 'Backspace') digitar('apagar'); else if (e.key === 'Escape') { setSel(null); setPin(''); } };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  return (
    <div className="pinwrap">
      <div className="row between" style={{ width: '100%', maxWidth: 560 }}>
        <div className="row" style={{ gap: 10 }}><Logo size={40} /><b className="display" style={{ fontSize: 20 }}>24 HORAS</b></div>
        <TemaBtn className="btn sm ghost" />
      </div>
      {!sel ? (
        <div className="col" style={{ width: '100%', maxWidth: 560, gap: 16 }}>
          <h1 style={{ textAlign: 'center' }}>{titulo}</h1>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {ativos.map((u) => (
              <button key={u.id} type="button" className="card col" style={{ alignItems: 'center', cursor: 'pointer', color: 'var(--text)', gap: 8, padding: 18 }} onClick={() => { setSel(u); setPin(''); setErro(''); }}>
                <Avatar u={u} tamanho={56} />
                <b style={{ fontSize: 17 }}>{u.nome}</b>
                <span className="small muted">{u.papel}</span>
              </button>
            ))}
          </div>
          <span className="small muted" style={{ textAlign: 'center' }}>Protótipo: Gilmar 5555 · Mansur 1234 · Ingrid 6666 · Joana 1111 · Bia 3333 · Rafael 2222 · Zé 4444</span>
        </div>
      ) : (
        <div className="col" style={{ alignItems: 'center', gap: 16, width: '100%', maxWidth: 340 }}>
          <Avatar u={sel} tamanho={72} />
          <div className="col" style={{ alignItems: 'center', gap: 2 }}><b style={{ fontSize: 22 }}>{sel.nome}</b><span className="muted">Digite seu PIN</span></div>
          <div className="row" style={{ gap: 14 }} aria-label={pin.length + ' de 4 dígitos'}>
            {[0, 1, 2, 3].map((k) => <span key={k} style={{ width: 16, height: 16, borderRadius: 8, background: k < pin.length ? 'var(--accent)' : 'transparent', border: '2px solid ' + (erro ? 'var(--bad)' : 'var(--line-2)') }} />)}
          </div>
          <span className="small bad" style={{ minHeight: 18 }} role="alert">{erro}</span>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'voltar', '0', 'apagar'].map((k) => (
              <button key={k} type="button" className="btn big" style={{ height: 64, fontSize: k.length > 1 ? 14 : 26, fontWeight: 700 }}
                aria-label={k === 'apagar' ? 'Apagar' : k === 'voltar' ? 'Trocar de pessoa' : k}
                onClick={() => (k === 'voltar' ? (setSel(null), setPin('')) : digitar(k))}>
                {k === 'apagar' ? '⌫' : k === 'voltar' ? 'Voltar' : k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
