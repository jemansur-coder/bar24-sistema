import { useState } from 'react';
import { ir } from '../router.jsx';
import { A, brl, desde, estadoSalao, nomeCliente, totalComanda, useNow, useStore } from '../store.jsx';
import { Modal } from '../ui.jsx';
import { useOperador } from '../sessao.jsx';
import { NovaComanda } from './Caixa.jsx';

// Mapa do salão: cada mesa colorida pelo estado. Toque na mesa para abrir, trocar, juntar ou transferir.

export const ESTADOS = {
  livre: ['Livre', 'var(--line-2)', 'var(--card)'],
  ocupada: ['Ocupada', 'var(--accent)', 'var(--card)'],
  pronto: ['Pedido pronto', 'var(--ok)', 'var(--ok-soft)'],
  conta: ['Pediu a conta', 'var(--warn)', 'var(--accent-soft)'],
  chamando: ['Chamando', 'var(--bad)', 'var(--bad-soft)'],
  parado: ['Sem pedir há 40+ min', 'var(--info)', 'var(--info-soft)'],
};

function Transferir({ origem, onClose }) {
  const { s, act } = useStore();
  const [sel, setSel] = useState({});
  const [destino, setDestino] = useState('');
  const outras = s.comandas.filter((c) => c.status === 'aberta' && c.id !== origem.id);
  const livres = s.mesasSalao.filter((m) => !s.comandas.some((c) => c.status === 'aberta' && c.mesaId === m.id));
  const itens = Object.entries(sel).filter(([, q]) => q > 0).map(([itemId, qtd]) => ({ itemId, qtd }));
  const nomeDe = (c) => (c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome + ' · ' : '') + 'Comanda ' + c.numero;
  const ok = () => {
    const dest = destino.startsWith('mesa:') ? { mesaId: destino.slice(5) || null } : destino;
    act((d) => A.transferirItens(d, origem.id, itens, dest));
    onClose(true);
  };
  return (
    <Modal titulo={'Transferir itens · ' + nomeDe(origem)} onClose={() => onClose(false)}>
      <span className="muted">Escolha os itens e a quantidade que vai para a outra conta.</span>
      <div className="col" style={{ gap: 0 }}>
        {origem.itens.map((i) => (
          <div key={i.id} className="list-item">
            <div className="col" style={{ gap: 2 }}><b>{i.qtd}× {i.nome}</b><span className="small muted">{brl(i.preco * i.qtd)}</span></div>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="qtybtn" style={{ width: 40, height: 40 }} aria-label={'Menos ' + i.nome} onClick={() => setSel({ ...sel, [i.id]: Math.max(0, (sel[i.id] || 0) - 1) })}>−</button>
              <b style={{ minWidth: 20, textAlign: 'center' }}>{sel[i.id] || 0}</b>
              <button type="button" className="qtybtn" style={{ width: 40, height: 40 }} aria-label={'Mais ' + i.nome} onClick={() => setSel({ ...sel, [i.id]: Math.min(i.qtd, (sel[i.id] || 0) + 1) })}>+</button>
              <button type="button" className="btn sm ghost" onClick={() => setSel({ ...sel, [i.id]: i.qtd })}>Tudo</button>
            </div>
          </div>
        ))}
      </div>
      <label className="field">Para onde?
        <select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="">Escolha</option>
          {outras.length > 0 && <optgroup label="Conta aberta">{outras.map((c) => <option key={c.id} value={c.id}>{nomeDe(c)}</option>)}</optgroup>}
          <optgroup label="Abrir conta nova">
            {livres.map((m) => <option key={m.id} value={'mesa:' + m.id}>{m.nome} (nova comanda)</option>)}
            <option value="mesa:">Sem mesa (nova comanda)</option>
          </optgroup>
        </select>
      </label>
      <button type="button" className="btn primary big" disabled={!itens.length || !destino} onClick={ok}>Transferir {itens.reduce((a, x) => a + x.qtd, 0) || ''} item(ns)</button>
    </Modal>
  );
}

function PainelMesa({ mesa, onClose }) {
  const { s, act } = useStore();
  const { usuario } = useOperador();
  const now = useNow(30000);
  const e = estadoSalao(s, mesa, now);
  const [modo, setModo] = useState(null); // 'trocar' | 'juntar' | {transferir: comanda} | 'nova'
  const livres = s.mesasSalao.filter((m) => m.id !== mesa.id && !s.comandas.some((c) => c.status === 'aberta' && c.mesaId === m.id));
  const abrirNo = (c) => ir((usuario?.papel === 'Garçom' ? 'garcom-' : 'caixa-') + c.id);
  if (modo === 'nova') return <NovaComanda mesaInicial={mesa.id} onClose={onClose} onCriada={(id) => ir((usuario?.papel === 'Garçom' ? 'garcom-' : 'caixa-') + id)} />;
  if (modo?.transferir) return <Transferir origem={modo.transferir} onClose={() => onClose()} />;
  return (
    <Modal titulo={mesa.nome + ' · ' + ESTADOS[e.estado][0]} onClose={onClose}>
      {!e.cmds.length && (
        <>
          <span className="muted">Mesa livre.</span>
          <button type="button" className="btn primary big" onClick={() => setModo('nova')}>Abrir comanda nesta mesa</button>
        </>
      )}
      {e.cmds.map((c) => {
        const t = totalComanda(c, s.config); const cl = s.clientes.find((x) => x.id === c.clienteId);
        return (
          <div key={c.id} className="card tight col" style={{ gap: 8 }}>
            <div className="row between"><b className="display" style={{ fontSize: 20 }}>Comanda {c.numero}</b><b className="num">{brl(t.falta)}</b></div>
            <span className="small muted">{cl ? nomeCliente(cl) + ' · ' : ''}{c.pessoas} pessoa(s) · garçom {c.garcom} · aberta há {desde(c.abertaEm, now)}</span>
            <span className="small">{c.itens.map((i) => i.qtd + '× ' + i.nome).join(', ') || 'Sem itens ainda'}</span>
            <div className="row wrap" style={{ gap: 6 }}>
              <button type="button" className="btn primary sm" onClick={() => abrirNo(c)}>Abrir comanda</button>
              <button type="button" className="btn sm" disabled={!c.itens.length} onClick={() => setModo({ transferir: c })}>Transferir itens</button>
              <button type="button" className="btn sm" onClick={() => setModo(modo === 'trocar' + c.id ? null : 'trocar' + c.id)}>Trocar de mesa</button>
              <button type="button" className="btn sm" onClick={() => setModo(modo === 'juntar' + c.id ? null : 'juntar' + c.id)}>Juntar com outra</button>
            </div>
            {modo === 'trocar' + c.id && (
              <div className="col" style={{ gap: 6 }}>
                <span className="small muted">Mover para qual mesa livre?</span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {livres.map((m) => <button key={m.id} type="button" className="chip" onClick={() => { act((d) => A.trocarMesa(d, c.id, m.id)); onClose(); }}>{m.nome}</button>)}
                  {!livres.length && <span className="small muted">Nenhuma mesa livre</span>}
                </div>
              </div>
            )}
            {modo === 'juntar' + c.id && (
              <div className="col" style={{ gap: 6 }}>
                <span className="small muted">Juntar esta conta em qual? Os itens e pagamentos passam para ela.</span>
                <div className="row wrap" style={{ gap: 6 }}>
                  {s.comandas.filter((x) => x.status === 'aberta' && x.id !== c.id).map((x) => (
                    <button key={x.id} type="button" className="chip" onClick={() => { act((d) => A.juntarComandas(d, c.id, x.id)); onClose(); }}>
                      {(x.mesaId ? s.mesasSalao.find((m) => m.id === x.mesaId)?.nome + ' · ' : '') + x.numero}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {e.cmds.length > 0 && <button type="button" className="btn" onClick={() => setModo('nova')}>+ Outra comanda nesta mesa</button>}
    </Modal>
  );
}

export default function Salao() {
  const { s } = useStore();
  const now = useNow(15000);
  const [aberta, setAberta] = useState(null);
  const mesas = s.mesasSalao.map((m) => ({ m, e: estadoSalao(s, m, now) }));
  const semMesa = s.comandas.filter((c) => c.status === 'aberta' && !c.mesaId);
  const cont = {};
  mesas.forEach(({ e }) => { cont[e.estado] = (cont[e.estado] || 0) + 1; });
  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}>
          <h1>Mapa do salão</h1>
          <span className="muted">{mesas.length - (cont.livre || 0)} ocupadas · {cont.livre || 0} livres · toque na mesa para abrir, trocar, juntar ou transferir</span>
        </div>
      </div>
      <div className="row wrap small" style={{ gap: 14, marginBottom: 12 }}>
        {Object.entries(ESTADOS).map(([k, [l, c]]) => <span key={k} className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 4, border: '2px solid ' + c, background: k === 'livre' ? 'transparent' : c }} />{l}</span>)}
      </div>
      <div className="salao">
        {mesas.map(({ m, e }) => {
          const [rot, cor, fundo] = ESTADOS[e.estado];
          const c = e.cmds[0];
          return (
            <button key={m.id} type="button" className={'mesa-salao' + (e.estado === 'chamando' ? ' pulsa' : '')} style={{ borderColor: cor, background: fundo }} onClick={() => setAberta(m)} aria-label={m.nome + ': ' + rot}>
              <div className="row between" style={{ width: '100%' }}>
                <b className="display" style={{ fontSize: 22 }}>{m.nome.replace('Mesa ', '')}</b>
                {e.cmds.length > 0 && <span className="small muted">{e.pessoas} pess.</span>}
              </div>
              {e.cmds.length ? (
                <>
                  <b className="num" style={{ fontSize: 18 }}>{brl(e.total)}</b>
                  <span className="small muted">Cmd {e.cmds.map((x) => x.numero).join(' + ')} · {c.garcom}</span>
                  <span className="small" style={{ color: cor, fontWeight: 700 }}>{e.estado === 'ocupada' ? 'último pedido há ' + desde(e.ultimo, now) : e.estado === 'parado' ? 'sem pedir há ' + desde(e.ultimo, now) : rot}</span>
                </>
              ) : (
                <span className="small muted" style={{ marginTop: 'auto' }}>{e.estado === 'chamando' ? <b className="bad">Chamando</b> : m.nome === 'Balcão' ? 'Balcão' : 'Livre'}</span>
              )}
            </button>
          );
        })}
      </div>
      {semMesa.length > 0 && (
        <section className="card col">
          <h2>Comandas sem mesa ({semMesa.length})</h2>
          <div className="row wrap" style={{ gap: 8 }}>
            {semMesa.map((c) => <a key={c.id} className="chip" href={'#caixa-' + c.id}>Comanda {c.numero} · {brl(totalComanda(c, s.config).falta)}</a>)}
          </div>
        </section>
      )}
      {aberta && <PainelMesa mesa={aberta} onClose={() => setAberta(null)} />}
    </>
  );
}
