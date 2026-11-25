import { useEffect, useRef, useState } from 'react';
import { A, avisosAbertos, desde, useNow, useStore } from '../store.jsx';
import { Modal, bip } from '../ui.jsx';
import { EsgotadosModal } from '../esgotados.jsx';

export const MOTIVOS_COZINHA = [
  ['ingrediente', 'Acabou ingrediente'],
  ['pedido', 'Dúvida ou problema num pedido'],
  ['ajuda', 'Preciso de ajuda'],
  ['equipamento', 'Equipamento com problema'],
  ['gerente', 'Chamar o gerente'],
  ['outro', 'Outro assunto'],
];
export const nomeMotivo = (m) => (MOTIVOS_COZINHA.find((x) => x[0] === m) || [, m])[1];

function FalarComBar({ tickets, onClose }) {
  const { act } = useStore();
  const [motivo, setMotivo] = useState('');
  const [texto, setTexto] = useState('');
  const [comandaNum, setComandaNum] = useState('');
  const precisaTexto = motivo === 'outro' || motivo === 'ingrediente';
  return (
    <Modal titulo="Falar com o bar" onClose={onClose}>
      <span className="muted">Escolha o assunto. O aviso aparece na hora no dashboard e no caixa.</span>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
        {MOTIVOS_COZINHA.map(([k, l]) => (
          <button key={k} type="button" className={'btn big' + (motivo === k ? ' primary' : '')} style={{ minHeight: 64, whiteSpace: 'normal' }} aria-pressed={motivo === k} onClick={() => setMotivo(k)}>{l}</button>
        ))}
      </div>
      {motivo === 'pedido' && tickets.length > 0 && (
        <label className="field">Qual comanda?
          <select className="input" value={comandaNum} onChange={(e) => setComandaNum(e.target.value)}>
            <option value="">Nenhuma específica</option>
            {tickets.map((t) => <option key={t.envio} value={t.c.numero}>Comanda {t.c.numero} · {t.itens.map((i) => i.qtd + '× ' + i.nome).join(', ')}</option>)}
          </select>
        </label>
      )}
      <label className="field">{motivo === 'ingrediente' ? 'Qual ingrediente acabou?' : 'Mensagem (opcional)'}
        <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={motivo === 'ingrediente' ? 'Ex.: bacon, pão de hambúrguer' : 'Escreva rapidinho o que precisa'} />
      </label>
      <button type="button" className="btn primary big" disabled={!motivo || (precisaTexto && !texto.trim())} onClick={() => { act((d) => A.avisarBar(d, { motivo, texto: texto.trim(), comandaNum })); onClose(); }}>Enviar chamado ao bar</button>
    </Modal>
  );
}

const META_MIN = 15; // tempo-alvo de preparo

export function ticketsCozinha(s) {
  const out = [];
  for (const c of s.comandas) {
    if (c.status !== 'aberta') continue;
    const g = {};
    for (const i of c.itens) if (i.destino === 'cozinha' && (i.status === 'enviado' || i.status === 'preparo')) (g[i.envio] = g[i.envio] || []).push(i);
    for (const [envio, itens] of Object.entries(g)) out.push({ c, envio, itens, ts: itens[0].enviadoEm, preparo: itens.some((i) => i.status === 'preparo') });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

export default function Cozinha() {
  const { s, act } = useStore();
  const now = useNow(1000);
  const tickets = ticketsCozinha(s);
  const resumo = {};
  tickets.forEach((t) => t.itens.forEach((i) => { resumo[i.nome] = (resumo[i.nome] || 0) + i.qtd; }));
  const [falar, setFalar] = useState(false);
  const [esg, setEsg] = useState(false);
  const meus = avisosAbertos(s);
  // bip na cozinha quando o bar responde
  const vistos = useRef(null);
  useEffect(() => {
    const v = new Set(meus.filter((a) => a.status === 'visto').map((a) => a.id));
    if (vistos.current && [...v].some((id) => !vistos.current.has(id))) bip(880, 0.12, 2);
    vistos.current = v;
  });
  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}><h1>Cozinha</h1><span className="muted">{tickets.length} pedido(s) na fila · meta de preparo {META_MIN} min</span></div>
        <div className="row wrap small" style={{ gap: 16 }}>
          <button type="button" className="btn big" onClick={() => setEsg(true)}>Marcar esgotado</button>
          <button type="button" className="btn primary big" onClick={() => setFalar(true)}>Falar com o bar</button>
          <span className="row" style={{ gap: 6 }}><span className="pill ok">&nbsp;</span>No prazo</span>
          <span className="row" style={{ gap: 6 }}><span className="pill warn">&nbsp;</span>Atenção</span>
          <span className="row" style={{ gap: 6 }}><span className="pill bad">&nbsp;</span>Atrasado</span>
        </div>
      </div>
      {esg && <EsgotadosModal destino="cozinha" onClose={() => setEsg(false)} />}
      {falar && <FalarComBar tickets={tickets} onClose={() => setFalar(false)} />}
      {meus.length > 0 && (
        <div className="col" style={{ gap: 8, marginBottom: 16 }}>
          {meus.map((a) => (
            <div key={a.id} className="card tight row between wrap" style={{ borderColor: a.status === 'visto' ? 'var(--ok)' : 'var(--accent)', background: a.status === 'visto' ? 'var(--ok-soft)' : 'var(--accent-soft)' }}>
              <div className="col" style={{ gap: 2 }}>
                <b>{nomeMotivo(a.motivo)}{a.comandaNum ? ' · Comanda ' + a.comandaNum : ''}{a.texto ? ': ' + a.texto : ''}</b>
                <span className={'small ' + (a.status === 'visto' ? 'ok' : 'muted')}>{a.status === 'visto' ? (a.vistoPor || 'Bar') + ' viu e está resolvendo · há ' + desde(a.vistoEm, now) : 'Enviado há ' + desde(a.ts, now) + ' · aguardando o bar'}</span>
              </div>
              <button type="button" className="btn sm" onClick={() => act((d) => A.resolverAviso(d, a.id))}>Já resolveu</button>
            </div>
          ))}
        </div>
      )}
      {Object.keys(resumo).length > 0 && (
        <div className="card tight row wrap" style={{ fontSize: 16 }}>
          <b className="muted">Produzir agora:</b>
          {Object.entries(resumo).map(([n, q]) => <b key={n}>{q}× {n}</b>)}
        </div>
      )}
      {!tickets.length && <div className="empty" style={{ fontSize: 18, padding: 60 }}>Nenhum pedido na fila. Os pedidos enviados pelo caixa ou pelos garçons aparecem aqui na hora.</div>}
      <div className="kds">
        {tickets.map((t) => {
          const min = (now - t.ts) / 60000;
          const nivel = min > META_MIN ? 'atrasado' : min > META_MIN * 0.66 ? 'atencao' : '';
          return (
            <article key={t.envio} className={'ticket ' + nivel}>
              <div className="head">
                <div className="col" style={{ gap: 0 }}><b className="display" style={{ fontSize: 26 }}>{t.c.numero}</b><span style={{ fontWeight: 600 }}>{t.c.garcom}</span></div>
                <b className="display num" style={{ fontSize: 28 }}>{desde(t.ts, now)}</b>
              </div>
              <div className="body">
                {t.itens.map((i) => <div key={i.id} className="col" style={{ gap: 2 }}><span className="it">{i.qtd}× {i.nome}</span>{i.obs && <span className="obs">{i.obs}</span>}</div>)}
                {t.preparo
                  ? <button type="button" className="btn success big" onClick={() => act((d) => A.pronto(d, t.c.id, t.envio))}>OK — Pronto</button>
                  : <button type="button" className="btn big" onClick={() => act((d) => A.iniciarPreparo(d, t.c.id, t.envio))}>Iniciar preparo</button>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
