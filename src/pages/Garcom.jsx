import { useEffect, useState } from 'react';
import { A, brl, desde, nomeCliente, prontosParaLevar, totalComanda, useNow, useStore } from '../store.jsx';
import { CATEGORIAS } from '../seed.js';
import { FotoProduto } from '../fotos.jsx';
import { Link, useRota } from '../router.jsx';
import { useOperador } from '../sessao.jsx';
import { Cardapio, ItensComanda, NovaComanda, Pagamento } from './Caixa.jsx';
import { mmss } from '../store.jsx';
import { precoFicha, saldoFichas } from '../sinuca.js';
import { VenderFichas } from './SinucaControle.jsx';
import { Modal } from '../ui.jsx';
import { configurarPOS, imprimir, naPOS } from '../integracoes/pagamento.js';

// Texto da comanda para a impressora térmica da maquininha (32 colunas).
function textoComanda(c, s) {
  const t = totalComanda(c, s.config);
  const mesa = c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome : '';
  const linha = (a, b) => { a = String(a); b = String(b); return a.slice(0, 31 - b.length).padEnd(32 - b.length) + b; };
  const v = (n) => n.toFixed(2).replace('.', ',');
  const l = ['BAR 24 HORAS', 'Comanda ' + c.numero + (mesa ? ' - ' + mesa : ''), 'Garcom: ' + c.garcom, new Date().toLocaleString('pt-BR'), '-'.repeat(32)];
  c.itens.forEach((i) => { l.push(linha(i.qtd + 'x ' + i.nome, v(i.preco * i.qtd))); if (i.obs) l.push('   obs: ' + i.obs); });
  l.push('-'.repeat(32));
  if (t.serv) { l.push(linha('Subtotal', v(t.sub))); l.push(linha('Servico', v(t.serv))); }
  l.push(linha('TOTAL R$', v(t.total)));
  if (t.pago) { l.push(linha('Pago', v(t.pago))); l.push(linha('Falta', v(t.falta))); }
  l.push('', 'Nao e documento fiscal', '', '');
  return l.join('\n');
}

// Sinuca na maquininha do garçom: ver cada mesa, liberar a próxima partida e vender fichas
// (na comanda do cliente ou cobrando na própria maquininha).
function SinucaGarcom() {
  const { s, act } = useStore();
  const now = useNow(1000);
  const [vender, setVender] = useState(null);
  const [msg, setMsg] = useState('');
  const mesas = s.mesas.filter((m) => m.tipo === 'sinuca');
  const aviso = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3500); };
  return (
    <section className="col">
      <span className="small muted">Sinuca por ficha: {brl(precoFicha(s))} cada partida. Cada mesa tem o próprio saldo de fichas.</span>
      {msg && <div className="ok">{msg}</div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {mesas.map((m) => {
          const se = m.sessao; const saldo = saldoFichas(se);
          const cmd = se?.comandaId && s.comandas.find((c) => c.id === se.comandaId && c.status === 'aberta');
          return (
            <div key={m.id} className="card tight col" style={{ gap: 6, borderColor: !se ? undefined : saldo ? 'var(--ok)' : 'var(--warn)' }}>
              <div className="row between"><b className="display" style={{ fontSize: 20 }}>{m.nome}</b><span className={'pill ' + (!se ? 'off' : saldo ? 'ok' : 'warn')}>{!se ? 'LIVRE' : saldo ? 'EM JOGO' : 'ÚLTIMA FICHA'}</span></div>
              {se ? (
                <>
                  <span>Ficha <b className="num">{se.usadas}/{se.fichas}</b> · saldo <b className="num">{saldo}</b> · {brl(se.valor)}</span>
                  <span className="small muted">Partida há {mmss(Math.max(0, now - (se.partidaEm || se.inicio)))}{cmd ? ' · comanda ' + cmd.numero : ' · pago na hora'}</span>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button type="button" className="btn sm primary" disabled={!saldo} onClick={() => { act((d) => A.novaPartida(d, m.id)); aviso(m.nome + ': partida ' + (se.usadas + 1) + ' liberada'); }}>Próxima partida</button>
                    <button type="button" className="btn sm" onClick={() => setVender(m.id)}>Vender fichas</button>
                  </div>
                </>
              ) : (
                <button type="button" className="btn sm primary" onClick={() => setVender(m.id)}>Abrir mesa com fichas</button>
              )}
            </div>
          );
        })}
      </div>
      {vender && (() => { const m = s.mesas.find((x) => x.id === vender); return (
        <Modal titulo={(m.sessao ? 'Vender fichas · ' : 'Abrir ') + m.nome} onClose={() => setVender(null)}>
          <VenderFichas mesa={m} compacto onFeito={(t) => { setVender(null); aviso('Lançado: ' + t); }} />
        </Modal>
      ); })()}
    </section>
  );
}

// Cardápio digital para o garçom conferir: foto, descrição, preço e o que está esgotado.
function CardapioDigital() {
  const { s } = useStore();
  const [cat, setCat] = useState('Todos');
  const [busca, setBusca] = useState('');
  const lista = s.produtos.filter((p) => p.ativo && (busca ? (p.nome + ' ' + (p.descricao || '')).toLowerCase().includes(busca.toLowerCase()) : cat === 'Todos' || p.cat === cat));
  const nEsg = s.produtos.filter((p) => p.ativo && p.esgotado).length;
  return (
    <section className="col">
      <label className="field">Buscar no cardápio<input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou ingrediente" /></label>
      <div className="row wrap" style={{ gap: 8 }}>
        {['Todos', ...CATEGORIAS].map((c) => <button key={c} type="button" className={'chip' + (!busca && cat === c ? ' on' : '')} onClick={() => { setCat(c); setBusca(''); }}>{c}</button>)}
      </div>
      {nEsg > 0 && <span className="small bad"><b>{nEsg} produto(s) esgotado(s) agora</b> · avise o cliente antes de anotar</span>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {lista.map((p) => (
          <div key={p.id} className="card tight row" style={{ gap: 12, alignItems: 'flex-start', opacity: p.esgotado ? 0.6 : 1 }}>
            <FotoProduto produto={p} tamanho={84} raio={12} style={p.esgotado ? { filter: 'grayscale(1)' } : undefined} />
            <div className="col" style={{ gap: 4, minWidth: 0 }}>
              <b>{p.nome}</b>
              {p.descricao && <span className="small muted">{p.descricao}</span>}
              <div className="row" style={{ gap: 8 }}>
                <b className="accent display">{brl(p.preco)}</b>
                <span className="small muted">{p.cat} · {p.destino === 'cozinha' ? 'cozinha' : 'bar'}</span>
              </div>
              {p.esgotado && <b className="small bad">ESGOTADO</b>}
            </div>
          </div>
        ))}
        {!lista.length && <div className="empty">Nenhum produto</div>}
      </div>
    </section>
  );
}

// Pedidos prontos das comandas do garçom: cozinha e bar avisam aqui.
function ProntosParaBuscar({ garcom, onAbrir }) {
  const { s, act } = useStore();
  const now = useNow(15000);
  const lista = prontosParaLevar(s, garcom);
  if (!lista.length) return null;
  return (
    <section className="card col" style={{ borderColor: 'var(--ok)', background: 'var(--ok-soft)' }} aria-label="Pedidos prontos">
      <h2>Prontos para levar ({lista.length})</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {lista.map(({ c, envio, origem, itens, ts }) => (
          <div key={envio + origem} className="card tight col" style={{ gap: 6 }}>
            <div className="row between">
              <b className="ok">{origem === 'bar' ? 'Buscar no balcão do bar' : 'Buscar na cozinha'}</b>
              <span className="small muted">há {desde(ts, now)}</span>
            </div>
            <b className="display" style={{ fontSize: 18 }}>{c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome + ' · ' : ''}Comanda {c.numero}</b>
            <span>{itens.map((i) => i.qtd + '× ' + i.nome + (i.obs ? ' (' + i.obs + ')' : '')).join(', ')}</span>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn success sm" onClick={() => act((d) => A.entregue(d, c.id, envio, origem))}>Entregue na mesa</button>
              <button type="button" className="btn sm ghost" onClick={() => onAbrir(c.id)}>Abrir comanda</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const OBS = ['Sem cebola', 'Bem passado', 'Bem gelada', 'Com copo', 'Gelo e limão', 'Sem sal'];

// Versão para o tablet/maquininha do garçom: telas grandes, poucos toques.
export default function Garcom() {
  const { s, act } = useStore();
  const now = useNow(30000);
  const garcons = s.usuarios.filter((u) => u.papel === 'Garçom' && u.ativo);
  const { usuario } = useOperador();
  const rota = useRota();
  const [eu, setEu] = useState(usuario?.papel === 'Garçom' ? usuario.nome : garcons[0]?.nome || '');
  const [selId, setSel] = useState(rota.startsWith('garcom-') ? rota.slice(7) : null);
  useEffect(() => { if (rota.startsWith('garcom-')) setSel(rota.slice(7)); }, [rota]);
  const [nova, setNova] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [msg, setMsg] = useState('');
  const [aba, setAba] = useState('comandas');
  const abertas = s.comandas.filter((c) => c.status === 'aberta');
  const minhas = abertas.filter((c) => c.garcom === eu);
  const outras = abertas.filter((c) => c.garcom !== eu);
  const c = abertas.find((x) => x.id === selId);

  if (!c) {
    return (
      <>
        <div className="topbar">
          <div className="col" style={{ gap: 2 }}><h1>Garçom</h1><span className="muted">Maquininha (POS) ou tablet no salão</span></div>
          {naPOS() && <button type="button" className="btn" onClick={configurarPOS} aria-label="Configurar maquininha">⚙ Maquininha</button>}
          {usuario?.papel === 'Garçom' ? <Link className="btn" to="salao">Mapa do salão</Link> : (
            <label className="field" style={{ minWidth: 200 }}>Ver comandas de
              <select className="input" value={eu} onChange={(e) => setEu(e.target.value)}>{garcons.map((g) => <option key={g.id}>{g.nome}</option>)}</select>
            </label>
          )}
        </div>
        <div className="row" style={{ gap: 8 }} role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'comandas'} className={'chip' + (aba === 'comandas' ? ' on' : '')} onClick={() => setAba('comandas')}>Comandas</button>
          <button type="button" role="tab" aria-selected={aba === 'sinuca'} className={'chip' + (aba === 'sinuca' ? ' on' : '')} onClick={() => setAba('sinuca')}>Sinuca</button>
          <button type="button" role="tab" aria-selected={aba === 'cardapio'} className={'chip' + (aba === 'cardapio' ? ' on' : '')} onClick={() => setAba('cardapio')}>Cardápio</button>
        </div>
        {aba === 'sinuca' ? <SinucaGarcom /> : aba === 'cardapio' ? <CardapioDigital /> : (<>
        <ProntosParaBuscar garcom={eu} onAbrir={setSel} />
        <button type="button" className="btn primary big" onClick={() => setNova(true)}>+ Abrir comanda / mesa</button>
        {[['Minhas comandas', minhas], ['Outras comandas', outras]].map(([tit, lista]) => (
          <section key={tit} className="col">
            <h2>{tit}</h2>
            {!lista.length && <div className="empty">Nenhuma</div>}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {lista.map((x) => {
                const t = totalComanda(x, s.config); const prontoCoz = x.itens.some((i) => i.status === 'pronto' && i.destino === 'cozinha'); const prontoBar = x.itens.some((i) => i.status === 'pronto' && i.destino !== 'cozinha'); const pronto = prontoCoz || prontoBar;
                const cl = s.clientes.find((k) => k.id === x.clienteId);
                return (
                  <button key={x.id} type="button" className="card col" style={{ textAlign: 'left', cursor: 'pointer', gap: 6, borderColor: pronto ? 'var(--ok)' : x.contaPedida ? 'var(--warn)' : undefined }} onClick={() => setSel(x.id)}>
                    <b className="display" style={{ fontSize: 24 }}>{x.numero}</b>
                    <span className="small muted">{cl ? nomeCliente(cl) + ' · ' : ''}{desde(x.abertaEm, now)}</span>
                    <b className="num">{brl(t.total)}</b>
                    {prontoCoz && <span className="small ok"><b>Prato pronto na cozinha</b></span>}
                    {prontoBar && <span className="small ok"><b>Bebida pronta no bar</b></span>}
                    {x.contaPedida && <span className="small" style={{ color: 'var(--warn)' }}><b>{x.contaEmitidaEm && !x.contaEntregueEm ? 'Conta pronta no caixa' : x.contaEntregueEm ? 'Conta entregue' : 'Pediu a conta'}</b></span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        </>)}
        {nova && <NovaComanda garcom={eu} onClose={() => setNova(false)} onCriada={(id) => { setNova(false); setSel(id); }} />}
      </>
    );
  }

  const t = totalComanda(c, s.config);
  const pend = c.itens.filter((i) => i.status === 'pendente');
  const ultimo = pend[pend.length - 1];
  const qtdPorProduto = {};
  pend.forEach((i) => { qtdPorProduto[i.produtoId] = (qtdPorProduto[i.produtoId] || 0) + i.qtd; });
  return (
    <>
      <div className="topbar">
        <div className="row">
          <button type="button" className="btn" onClick={() => setSel(null)} aria-label="Voltar">←</button>
          <div className="col" style={{ gap: 2 }}><h1>Comanda {c.numero}</h1><span className="muted">{c.pessoas} pessoa(s) · aberta há {desde(c.abertaEm, now)} · {eu}</span></div>
        </div>
      </div>
      <div className="row wrap" style={{ alignItems: 'flex-start', gap: 16 }}>
        <section className="card col" style={{ flex: '2 1 420px', minWidth: 0 }}>
          <Cardapio qtdPorProduto={qtdPorProduto} onAdd={(pid) => act((d) => A.addItem(d, c.id, pid))} />
          {ultimo && (
            <div className="field">Observação rápida para "{ultimo.nome}"
              <div className="row wrap" style={{ gap: 8 }}>
                {OBS.map((o) => <button key={o} type="button" className={'btn sm' + (ultimo.obs === o ? ' sel' : '')} onClick={() => act((d) => A.obsItem(d, c.id, ultimo.id, ultimo.obs === o ? '' : o))}>{o}</button>)}
              </div>
            </div>
          )}
        </section>
        <section className="card col" style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h2>Pedido</h2>
          <ItensComanda c={c} />
          <div className="row between"><span className="muted">Total da comanda</span><b className="display num" style={{ fontSize: 24 }}>{brl(t.total)}</b></div>
          {msg && <div className="ok">{msg}</div>}
          <button type="button" className="btn primary big" disabled={!pend.length} onClick={() => { const n = act((d) => A.enviar(d, c.id)); setMsg(n + ' item(ns) enviados. Bebidas vão para o bar e pratos para a cozinha. Você recebe um aviso quando ficarem prontos.'); setTimeout(() => setMsg(''), 3500); }}>Enviar pedido{pend.length ? ' (' + pend.reduce((a, i) => a + i.qtd, 0) + ')' : ''}</button>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" className="btn" onClick={() => act((d) => { const x = d.comandas.find((k) => k.id === c.id); x.contaPedida = !x.contaPedida; })}>{c.contaPedida ? 'Cancelar conta' : 'Pedir a conta'}</button>
            <button type="button" className="btn" disabled={pend.length > 0 || !t.falta} onClick={() => setPagando(true)}>Cobrar aqui</button>
          </div>
          {naPOS() && <button type="button" className="btn" disabled={!c.itens.length} onClick={() => imprimir(textoComanda(c, s))}>Imprimir comanda</button>}
        </section>
      </div>
      {/* maquininha (tela pequena): barra fixa embaixo com o total e o envio, sem precisar rolar até o pedido */}
      <div className="pos-barra">
        <div className="col" style={{ gap: 0 }}><span className="small muted">{pend.length ? pend.reduce((a, i) => a + i.qtd, 0) + ' item(ns) a enviar' : 'Total'}</span><b className="display num" style={{ fontSize: 20 }}>{brl(t.total)}</b></div>
        <button type="button" className="btn primary" disabled={!pend.length} onClick={() => { const n = act((d) => A.enviar(d, c.id)); setMsg(n + ' item(ns) enviados.'); setTimeout(() => setMsg(''), 3500); }}>Enviar pedido</button>
      </div>
      {pagando && <Pagamento comanda={c} onClose={(f) => { setPagando(false); if (f) setSel(null); }} />}
    </>
  );
}
