import { useState } from 'react';
import { ir, useRota } from '../router.jsx';
import { Link } from '../router.jsx';
import { A, METODOS, brl, desde, estadoMesa, hora, mmss, nomeCliente, relogioMesa, tipoJogo, useNow, useStore } from '../store.jsx';
import { TIPOS_JOGO } from '../seed.js';
import { Modal } from '../ui.jsx';
import { ControleFichas, GerenciarFicha, VenderFichas } from './SinucaControle.jsx';
import { precoFicha, saldoFichas } from '../sinuca.js';

const STATUS = { livre: ['LIVRE', 'off'], jogo: ['EM JOGO', 'ok'], acabando: ['ACABANDO', 'warn'], esgotado: ['ESGOTADO', 'bad'] };

function Gerenciar({ mesa, onClose }) {
  const { act } = useStore();
  const now = useNow();
  const [metodo, setMetodo] = useState('dinheiro');
  const se = mesa.sessao; const t = tipoJogo(se.jogo);
  const add = (min) => { act((d) => A.maisTempo(d, mesa.id, min, metodo)); onClose(); };
  if (se.jogo === 'ficha') return <GerenciarFicha mesa={mesa} onClose={onClose} />;
  return (
    <Modal titulo={mesa.nome} onClose={onClose}>
      <div className="row between"><span className="muted">{t.nome} · {se.jogadores} jogador(es)</span><span className="muted">Início {hora(se.inicio)} · fim {hora(se.fim)}</span></div>
      <div className="display num" style={{ fontSize: 56, fontWeight: 700, textAlign: 'center' }}>{mmss(Math.max(0, se.fim - now))}</div>
      <div className="row between"><span className="muted">Valor do jogo até agora</span><b className="num">{brl(se.valor)}</b></div>
      {!se.comandaId && (
        <div className="field">Cobrar tempo extra em
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
            {['dinheiro', 'cartao', 'pix'].map((k) => <button key={k} type="button" className={'btn' + (metodo === k ? ' sel' : '')} onClick={() => setMetodo(k)}>{METODOS[k]}</button>)}
          </div>
        </div>
      )}
      {se.comandaId && <span className="small muted">O tempo extra entra na comanda vinculada.</span>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        {[15, 30, 60].map((m) => <button key={m} type="button" className="btn primary" onClick={() => add(m)}>+{m} min ({brl(t.preco * se.jogadores * m / 30)})</button>)}
      </div>
      <div className="row wrap">
        <Link className="btn" to={'parede-' + mesa.id}>Abrir tela da parede</Link>
        <button type="button" className="btn danger" onClick={() => { act((d) => A.encerrarJogo(d, mesa.id)); onClose(); }}>Encerrar e liberar mesa</button>
      </div>
    </Modal>
  );
}

export default function Jogos() {
  const { s, act } = useStore();
  const now = useNow();
  const rota = useRota();
  const livres = s.mesas.filter((m) => !m.sessao);
  const [mesaId, setMesa] = useState(livres[0]?.id || '');
  const [jogo, setJogo] = useState('ficha');
  const [jogadores, setJogadores] = useState(2);
  const [minutos, setMinutos] = useState(30);
  const [livre, setLivre] = useState('');
  const [cobranca, setCobranca] = useState('pix');
  const [comandaId, setComanda] = useState('');
  const [ok, setOk] = useState('');
  const gerId = rota.startsWith('jogos-') ? rota.slice(6) : null;
  const ger = s.mesas.find((m) => m.id === gerId && m.sessao);
  const t = tipoJogo(jogo);
  const total = t.preco * jogadores;
  const mesaSel = s.mesas.find((m) => m.id === mesaId && !m.sessao);
  const abertas = s.comandas.filter((c) => c.status === 'aberta');

  const fila = [...s.fila].sort((a, b) => a.ts - b.ts);
  const doFila = (f) => {
    const alvo = f.mesaJogoId ? s.mesas.find((m) => m.id === f.mesaJogoId) : s.mesas.find((m) => !m.sessao && m.tipo === f.tipo);
    if (alvo) setMesa(alvo.id);
    setJogo(f.tipo === 'sinuca' ? 'ficha' : 'pife'); setJogadores(f.tipo === 'sinuca' ? 1 : f.jogadores);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const iniciar = () => {
    act((d) => A.iniciarJogo(d, mesaId, { jogo, jogadores, minutos, metodo: cobranca, comandaId: cobranca === 'comanda' ? comandaId : null }));
    setOk(t.porFicha ? `${mesaSel.nome} iniciada: ${jogadores} ficha(s), ${brl(total)}` : `${mesaSel.nome} iniciada: ${t.nome}, ${jogadores} jogador(es), ${minutos} min, ${brl(total)}`);
    setTimeout(() => setOk(''), 4000);
    setMesa(s.mesas.find((m) => !m.sessao && m.id !== mesaId)?.id || '');
  };

  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}><h1>Jogos</h1><span className="muted">Sinuca por ficha ({brl(precoFicha(s))} a partida, controle por mesa) · cartas por tempo</span></div>
        <Link className="btn" to="parede">Abrir telas da parede</Link>
      </div>
      <div className="row wrap" style={{ alignItems: 'flex-start', gap: 20 }}>
        <section className="grow col" style={{ flex: '2 1 520px' }} aria-label="Mesas">
          <div className="card col" style={{ borderColor: fila.some((f) => f.status === 'chamado') ? 'var(--ok)' : undefined }}>
            <div className="row between wrap">
              <h2>Fila de espera ({fila.length})</h2>
              <a className="btn sm" href="#fila">Ver como cliente</a>
            </div>
            {!fila.length && <span className="muted">Ninguém na fila. O cliente entra pelo QR Code da fila ou pelo QR da mesa.</span>}
            {fila.map((f) => {
              const pos = fila.filter((x) => x.tipo === f.tipo && x.ts <= f.ts).length;
              const mj = f.mesaJogoId && s.mesas.find((m) => m.id === f.mesaJogoId);
              return (
                <div key={f.id} className="list-item">
                  <div className="col" style={{ gap: 2 }}>
                    <b>{pos}º {f.tipo === 'sinuca' ? 'Sinuca' : 'Cartas'} · {f.nome} · {f.jogadores} jog.</b>
                    <span className={'small ' + (f.status === 'chamado' ? 'ok' : 'muted')}>{f.status === 'chamado' ? 'Chamado para ' + mj?.nome + ' · avisado no celular e na TV' : 'Esperando há ' + Math.floor((now - f.ts) / 60000) + ' min'}</span>
                  </div>
                  <div className="row wrap" style={{ gap: 6 }}>
                    {f.status === 'aguardando' && s.mesas.some((m) => !m.sessao && m.tipo === f.tipo && !fila.some((x) => x.status === 'chamado' && x.mesaJogoId === m.id)) && <button type="button" className="btn sm" onClick={() => act((d) => { const m = d.mesas.find((k) => !k.sessao && k.tipo === f.tipo && !d.fila.some((x) => x.status === 'chamado' && x.mesaJogoId === k.id)); if (m) { const x = d.fila.find((k) => k.id === f.id); x.status = 'chamado'; x.mesaJogoId = m.id; x.chamadoEm = Date.now(); } })}>Chamar agora</button>}
                    <button type="button" className="btn sm primary" onClick={() => doFila(f)}>Iniciar jogo</button>
                    <button type="button" className="btn sm ghost" onClick={() => act((d) => A.sairFila(d, f.id))}>Remover</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mesas">
            {s.mesas.map((m) => {
              const e = estadoMesa(m, now, s.config.avisoMin); const [lbl, cls] = m.sessao?.jogo === 'ficha' && e === 'acabando' ? ['ÚLTIMA FICHA', 'warn'] : STATUS[e];
              const se = m.sessao; const tj = se && tipoJogo(se.jogo);
              const cmd = se?.comandaId && s.comandas.find((c) => c.id === se.comandaId);
              return (
                <div key={m.id} className={'mesa ' + e}>
                  <div className="row between"><b className="display" style={{ fontSize: 18 }}>{m.nome}</b><span className={'pill ' + cls}>{lbl}</span></div>
                  <span className={'t ' + (e === 'esgotado' ? 'bad' : e === 'acabando' ? 'accent' : e === 'livre' ? 'muted' : '')}>{relogioMesa(m, now)}</span>
                  <span className="small muted">{se ? (se.jogo === 'ficha' ? `${se.fichas} vendida(s) · saldo ${saldoFichas(se)} · ${brl(se.valor)} · partida há ${desde(se.partidaEm || se.inicio, now)}` : `${tj.nome} · ${se.jogadores} jog. · ${brl(se.valor)}`) + (cmd ? ' · comanda ' + cmd.numero : '') : (s.fila.find((f) => f.status === 'chamado' && f.mesaJogoId === m.id) ? 'Reservada para ' + s.fila.find((f) => f.status === 'chamado' && f.mesaJogoId === m.id).nome + ' (fila)' : 'Disponível')}</span>
                  <div className="row wrap" style={{ marginTop: 'auto', gap: 6 }}>
                    {se?.jogo === 'ficha' && (saldoFichas(se) > 0
                      ? <button type="button" className="btn sm primary" onClick={() => act((d) => A.novaPartida(d, m.id))}>Próxima partida</button>
                      : cmd ? <button type="button" className="btn sm primary" onClick={() => act((d) => A.maisFicha(d, m.id, 1))}>+1 ficha na {cmd.numero}</button>
                        : <button type="button" className="btn sm primary" onClick={() => ir('jogos-' + m.id)}>Vender ficha</button>)}
                    {se ? <button type="button" className={'btn sm' + (e === 'esgotado' ? ' danger' : '')} onClick={() => ir('jogos-' + m.id)}>{e === 'esgotado' ? 'Renovar / encerrar' : se.jogo === 'ficha' ? 'Fichas / encerrar' : 'Gerenciar'}</button>
                      : <button type="button" className="btn sm" onClick={() => { setMesa(m.id); setJogo(m.tipo === 'sinuca' ? 'ficha' : 'pife'); }}>Iniciar aqui</button>}
                    <Link className="btn sm ghost" to={'parede-' + m.id}>Tela</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card col" style={{ flex: '1 1 340px', maxWidth: 460 }} aria-label="Iniciar jogo">
          <h2>Iniciar jogo</h2>
          <div className="field">Local
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
              {s.mesas.map((m) => <button key={m.id} type="button" disabled={!!m.sessao || m.tipo !== t.mesa} className={'btn sm' + (m.id === mesaId ? ' sel' : '')} onClick={() => setMesa(m.id)}>{m.nome}</button>)}
            </div>
          </div>
          <div className="field">Jogo
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
              {TIPOS_JOGO.map((tj) => (
                <button key={tj.id} type="button" className={'btn' + (jogo === tj.id ? ' sel' : '')} style={{ height: 60, flexDirection: 'column', gap: 0 }} onClick={() => { setJogo(tj.id); const atual = s.mesas.find((m) => m.id === mesaId); if (!atual || atual.sessao || atual.tipo !== tj.mesa) { const alt = s.mesas.find((m) => !m.sessao && m.tipo === tj.mesa); if (alt) setMesa(alt.id); } }}>
                  <span>{tj.nome.replace(' sinuca', '')}</span><span className="small accent">{brl(tj.porFicha ? precoFicha(s) : tj.preco)}/{tj.porFicha ? 'ficha' : 'pessoa'}</span>
                </button>
              ))}
            </div>
          </div>
          {t.porFicha ? (mesaSel?.tipo === 'sinuca' ? <VenderFichas key={mesaSel.id} mesa={mesaSel} onFeito={(txt) => { setOk(mesaSel.nome + ' aberta: ' + txt); setTimeout(() => setOk(''), 4000); setMesa(s.mesas.find((m) => !m.sessao && m.id !== mesaId && m.tipo === 'sinuca')?.id || ''); }} /> : <div className="empty">Escolha uma mesa de sinuca livre</div>) : (<>
          <div className="field">{t.porFicha ? 'Fichas (cada ficha é uma partida)' : 'Jogadores'}
            <div className="row">
              <button type="button" className="btn" onClick={() => setJogadores(Math.max(1, jogadores - 1))} aria-label={t.porFicha ? 'Menos uma ficha' : 'Menos um jogador'}>−</button>
              <b className="display grow" style={{ fontSize: 30, textAlign: 'center', color: 'var(--text)' }}>{jogadores}</b>
              <button type="button" className="btn" onClick={() => setJogadores(jogadores + 1)} aria-label={t.porFicha ? 'Mais uma ficha' : 'Mais um jogador'}>+</button>
            </div>
          </div>
          {!t.porFicha && <div className="field">Tempo disponível
            <div className="grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8 }}>
              {[15, 30, 45, 60].map((m) => <button key={m} type="button" className={'btn sm' + (minutos === m && !livre ? ' sel' : '')} onClick={() => { setMinutos(m); setLivre(''); }}>{m} min</button>)}
              <input className="input" style={{ height: 34 }} inputMode="numeric" placeholder="outro" aria-label="Outro tempo em minutos" value={livre} onChange={(e) => { setLivre(e.target.value); const n = parseInt(e.target.value, 10); if (n > 0) setMinutos(n); }} />
            </div>
          </div>}
          <div className="field">Cobrança
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
              {[['pix', 'Pix'], ['cartao', 'Cartão'], ['dinheiro', 'Dinheiro'], ['comanda', 'Comanda']].map(([k, l]) => <button key={k} type="button" className={'btn sm' + (cobranca === k ? ' sel' : '')} onClick={() => setCobranca(k)}>{l}</button>)}
            </div>
            {cobranca === 'comanda' && (
              <select className="input" value={comandaId} onChange={(e) => setComanda(e.target.value)} aria-label="Comanda">
                <option value="">Escolha a comanda</option>
                {abertas.map((c) => <option key={c.id} value={c.id}>{c.numero}{c.clienteId ? ' · ' + nomeCliente(s.clientes.find((k) => k.id === c.clienteId)) : ''}</option>)}
              </select>
            )}
          </div>
          <div className="col" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <span className="muted">{t.porFicha ? `${t.nome} · ${brl(t.preco)} × ${jogadores} ficha(s) · sem limite de tempo` : `${t.nome} · ${brl(t.preco)} × ${jogadores} · ${minutos} min`}</span>
            <div className="row between"><b>Total</b><b className="display num accent" style={{ fontSize: 32 }}>{brl(total)}</b></div>
          </div>
          {ok && <div className="ok">{ok}</div>}
          <button type="button" className="btn primary big" disabled={!mesaSel || (cobranca === 'comanda' && !comandaId)} onClick={iniciar}>
            {mesaSel ? (cobranca === 'comanda' ? 'Lançar na comanda e iniciar' : 'Cobrar e iniciar') : 'Escolha uma mesa livre'}
          </button>
          </>)}
          {t.porFicha && ok && <div className="ok">{ok}</div>}
        </section>
      </div>
      <ControleFichas />
      {ger && <Gerenciar mesa={ger} onClose={() => ir('jogos')} />}
    </>
  );
}
