import { useEffect, useState } from 'react';
import { A, brl, desde, nomeCliente, prontosParaLevar, totalComanda, useNow, useStore } from '../store.jsx';
import { CATEGORIAS } from '../seed.js';
import { FotoProduto } from '../fotos.jsx';
import { Link, useRota } from '../router.jsx';
import { useOperador } from '../sessao.jsx';
import { Cardapio, ItensComanda, NovaComanda, Pagamento } from './Caixa.jsx';

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
          <div className="col" style={{ gap: 2 }}><h1>Garçom</h1><span className="muted">Tablet ou maquininha no salão</span></div>
          {usuario?.papel === 'Garçom' ? <Link className="btn" to="salao">Mapa do salão</Link> : (
            <label className="field" style={{ minWidth: 200 }}>Ver comandas de
              <select className="input" value={eu} onChange={(e) => setEu(e.target.value)}>{garcons.map((g) => <option key={g.id}>{g.nome}</option>)}</select>
            </label>
          )}
        </div>
        <div className="row" style={{ gap: 8 }} role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'comandas'} className={'chip' + (aba === 'comandas' ? ' on' : '')} onClick={() => setAba('comandas')}>Comandas</button>
          <button type="button" role="tab" aria-selected={aba === 'cardapio'} className={'chip' + (aba === 'cardapio' ? ' on' : '')} onClick={() => setAba('cardapio')}>Cardápio digital</button>
        </div>
        {aba === 'cardapio' ? <CardapioDigital /> : (<>
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
        </section>
      </div>
      {pagando && <Pagamento comanda={c} onClose={(f) => { setPagando(false); if (f) setSel(null); }} />}
    </>
  );
}
