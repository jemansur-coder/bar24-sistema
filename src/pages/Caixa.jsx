import { useEffect, useMemo, useState } from 'react';
import { Link, ir, useRota } from '../router.jsx';
import { useOperador } from '../sessao.jsx';
import { AbrirTurno } from './Turno.jsx';
import { EsgotadosModal } from '../esgotados.jsx';
import { A, METODOS, brl, desde, ehGestor, hora, nomeCliente, quem, totalComanda, useNow, useStore } from '../store.jsx';
import { CATEGORIAS } from '../seed.js';
import { Logo, Modal } from '../ui.jsx';
import { FotoProduto } from '../fotos.jsx';

// abrir a pré-conta de uma comanda a partir de qualquer tela (ex.: aviso "pediu a conta")
let contaParaAbrir = null;
export function abrirConta(comandaId) {
  contaParaAbrir = comandaId;
  window.dispatchEvent(new Event('bar24-abrir-conta'));
  ir('caixa-' + comandaId);
}

// Pré-conta (conferência) que o caixa imprime e o garçom leva à mesa. Não é documento fiscal.
export function PreConta({ comanda: c, onClose }) {
  const { s } = useStore();
  const t = totalComanda(c, s.config);
  const mesa = c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome : 'Balcão';
  const linhas = c.itens.filter((i) => i.status !== 'pendente');
  return (
    <Modal titulo={'Conta · ' + mesa} onClose={onClose} largura={440}>
      <div className="col" style={{ gap: 6, background: '#fff', color: '#111', borderRadius: 12, padding: '18px 18px 14px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13, border: '1px dashed #bbb' }}>
        <div className="col" style={{ alignItems: 'center', gap: 2 }}>
          <Logo size={34} />
          <b style={{ fontSize: 15 }}>{s.config.nomeBar.toUpperCase()}</b>
          <span>CONFERÊNCIA DE CONTA</span>
          <span>{mesa} · Comanda {c.numero} · {c.pessoas} pessoa(s)</span>
          <span>Garçom {c.garcom} · {hora(Date.now())}</span>
        </div>
        <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
        {linhas.map((i) => <div key={i.id} className="row between"><span>{i.qtd}× {i.nome}</span><span>{brl(i.preco * i.qtd)}</span></div>)}
        <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
        <div className="row between"><span>Subtotal</span><span>{brl(t.sub)}</span></div>
        {c.servico && <div className="row between"><span>Serviço ({s.config.servico}%)</span><span>{brl(t.serv)}</span></div>}
        {t.pago > 0 && <div className="row between"><span>Já pago</span><span>−{brl(t.pago)}</span></div>}
        <div className="row between" style={{ fontSize: 17 }}><b>TOTAL</b><b>{brl(t.falta)}</b></div>
        {c.pessoas > 1 && <div className="row between"><span>Por pessoa ({c.pessoas})</span><span>{brl(Math.ceil((t.falta / c.pessoas) * 100) / 100)}</span></div>}
        <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
        <span style={{ textAlign: 'center' }}>Pague com o garçom na maquininha ou no Pix pelo tablet da mesa.</span>
        <span style={{ textAlign: 'center', fontSize: 11 }}>Não é documento fiscal</span>
      </div>
      <span className="small ok"><b>Garçom {c.garcom} avisado na maquininha para levar a conta.</b></span>
      <button type="button" className="btn primary big" onClick={() => { try { if (!navigator.webdriver) window.print(); } catch (e) { /* sem impressora */ } onClose(); }}>Imprimir conta</button>
    </Modal>
  );
}

// O caixa acompanha os pedidos da cozinha: na fila, em preparo, pronto.
function AcompanhaCozinha() {
  const { s } = useStore();
  const now = useNow(5000);
  const lista = [];
  for (const c of s.comandas) {
    if (c.status !== 'aberta') continue;
    const g = {};
    for (const i of c.itens) if (i.destino === 'cozinha' && ['enviado', 'preparo', 'pronto'].includes(i.status)) (g[i.envio] = g[i.envio] || []).push(i);
    for (const [envio, itens] of Object.entries(g)) {
      const st = itens.some((i) => i.status === 'enviado') ? 'enviado' : itens.some((i) => i.status === 'preparo') ? 'preparo' : 'pronto';
      lista.push({ c, envio, itens, st, ts: itens[0].enviadoEm });
    }
  }
  if (!lista.length) return null;
  lista.sort((a, b) => a.ts - b.ts);
  const COR = { enviado: ['Na fila', 'var(--accent)'], preparo: ['Em preparo', 'var(--info)'], pronto: ['Pronto · garçom avisado', 'var(--ok)'] };
  return (
    <section className="card tight col" style={{ marginBottom: 16, gap: 8 }} aria-label="Pedidos na cozinha">
      <b className="small muted">COZINHA AGORA</b>
      <div className="row wrap" style={{ gap: 8 }}>
        {lista.map(({ c, envio, itens, st, ts }) => (
          <div key={envio} className="col" style={{ gap: 2, padding: '8px 12px', borderRadius: 12, border: '2px solid ' + COR[st][1], minWidth: 180 }}>
            <b style={{ fontSize: 13 }}>{c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome : 'Balcão'} · {c.numero} · há {desde(ts, now)}</b>
            <span className="small">{itens.map((i) => i.qtd + '× ' + i.nome).join(', ')}</span>
            <b className="small" style={{ color: COR[st][1] }}>{COR[st][0]}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

const STATUS_ITEM = {
  pendente: ['Pendente de envio', 'accent'],
  enviado: ['Na fila da cozinha', 'muted'],
  preparo: ['Em preparo', 'muted'],
  pronto: ['Pronto · levar à mesa', 'ok'],
  entregue: ['Entregue', 'muted'],
};

export function NovaComanda({ onClose, onCriada, garcom = quem(), mesaInicial = '' }) {
  const { s, act } = useStore();
  const [clienteId, setCliente] = useState('');
  const [pessoas, setPessoas] = useState(1);
  const [rotulo, setRotulo] = useState('');
  const [mesaId, setMesaId] = useState(mesaInicial);
  return (
    <Modal titulo="Nova comanda" onClose={onClose}>
      <label className="field">Número ou mesa (vazio = próximo número: {s.seq})
        <input className="input" value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Ex.: Mesa 4" />
      </label>
      <label className="field">Mesa (liga a comanda ao QR Code da mesa)
        <select className="input" value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
          <option value="">Sem mesa (balcão)</option>
          {s.mesasSalao.filter((m) => !s.comandas.some((c) => c.status === 'aberta' && c.mesaId === m.id)).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </label>
      <label className="field">Cliente (opcional, obrigatório para fiado)
        <select className="input" value={clienteId} onChange={(e) => setCliente(e.target.value)}>
          <option value="">Sem cliente</option>
          {s.clientes.map((c) => <option key={c.id} value={c.id}>{nomeCliente(c)}</option>)}
        </select>
      </label>
      <div className="field">Pessoas
        <div className="row">
          <button type="button" className="qtybtn" onClick={() => setPessoas(Math.max(1, pessoas - 1))} aria-label="Menos">−</button>
          <b className="display" style={{ fontSize: 22, minWidth: 30, textAlign: 'center', color: 'var(--text)' }}>{pessoas}</b>
          <button type="button" className="qtybtn" onClick={() => setPessoas(pessoas + 1)} aria-label="Mais">+</button>
        </div>
      </div>
      <button type="button" className="btn primary big" onClick={() => { const id = act((d) => A.novaComanda(d, { clienteId: clienteId || null, pessoas, rotulo: rotulo.trim(), garcom, mesaId: mesaId || null })); onCriada(id); }}>Abrir comanda</button>
    </Modal>
  );
}

export function Pagamento({ comanda, onClose }) {
  const { s, act } = useStore();
  const t = totalComanda(comanda, s.config);
  const [metodo, setMetodo] = useState('pix');
  const [valor, setValor] = useState(t.falta.toFixed(2).replace('.', ','));
  const [recebido, setRecebido] = useState('');
  const [clienteId, setCliente] = useState(comanda.clienteId || '');
  const [nota, setNota] = useState(true);
  const [cpf, setCpf] = useState('');
  const [pixOk, setPixOk] = useState(false);
  const [cartaoOk, setCartaoOk] = useState(false);
  const v = Math.min(t.falta, parseFloat(String(valor).replace(',', '.')) || 0);
  const rec = parseFloat(String(recebido).replace(',', '.')) || 0;
  const cl = s.clientes.find((c) => c.id === clienteId);
  const estouro = metodo === 'fiado' && cl && cl.fiado + v > cl.limite;
  const podePagar = v > 0 && (metodo !== 'fiado' || clienteId) && (metodo !== 'dinheiro' || !recebido || rec >= v);

  const pagar = () => {
    act((d) => {
      A.pagar(d, comanda.id, metodo, v, metodo === 'fiado' ? clienteId : null);
      const c = d.comandas.find((x) => x.id === comanda.id);
      if (totalComanda(c, d.config).falta <= 0.001) A.fecharComanda(d, comanda.id, { nota, cpf });
    });
    const restante = Math.round((t.falta - v) * 100) / 100;
    if (restante <= 0.001) onClose(true);
    else { setValor(restante.toFixed(2).replace('.', ',')); setRecebido(''); setPixOk(false); setCartaoOk(false); }
  };

  return (
    <Modal titulo={'Receber · Comanda ' + comanda.numero} onClose={() => onClose(false)}>
      <div className="row between"><span className="muted">Total</span><b className="num">{brl(t.total)}</b></div>
      {t.pago > 0 && <div className="row between"><span className="muted">Já pago</span><span className="num ok">{brl(t.pago)}</span></div>}
      <div className="row between"><span>Falta</span><b className="display num" style={{ fontSize: 28 }}>{brl(t.falta)}</b></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
        {Object.entries(METODOS).map(([k, l]) => <button key={k} type="button" className={'btn' + (metodo === k ? ' sel' : '')} onClick={() => setMetodo(k)}>{l}</button>)}
      </div>
      <label className="field">Valor deste pagamento (pode dividir em várias formas)
        <input className="input num" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
      {metodo === 'dinheiro' && (
        <label className="field">Valor recebido (para calcular o troco)
          <input className="input num" inputMode="decimal" value={recebido} onChange={(e) => setRecebido(e.target.value)} placeholder="Ex.: 100,00" />
          {rec > 0 && <span style={{ fontSize: 16, color: 'var(--text)' }}>Troco: <b className="num">{brl(Math.max(0, rec - v))}</b></span>}
        </label>
      )}
      {metodo === 'cartao' && (
        <div className="card tight row" style={{ alignItems: 'center', gap: 12 }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>
          <div className="col" style={{ gap: 6 }}>
            <span className="muted small">{cartaoOk ? 'Cartão aprovado.' : 'Aproxime, insira ou passe o cartão na maquininha (débito ou crédito).'}</span>
            {cartaoOk ? <span className="ok"><b>Aprovado · {brl(v)}</b></span> : <button type="button" className="btn sm" onClick={() => setCartaoOk(true)}>Simular cartão aprovado</button>}
          </div>
        </div>
      )}
      {metodo === 'pix' && (
        <div className="card tight row" style={{ alignItems: 'flex-start' }}>
          <svg width="96" height="96" viewBox="0 0 29 29" aria-label="QR Code Pix de exemplo" role="img" style={{ background: '#fff', borderRadius: 8, padding: 4, flex: 'none' }}>
            {Array.from({ length: 29 * 29 }).map((_, k) => { const x = k % 29, y = Math.floor(k / 29); const f = (x < 7 && y < 7) || (x > 21 && y < 7) || (x < 7 && y > 21); const on = f ? !(x % 6 && y % 6 && (x < 2 || x > 4 || y < 2 || y > 4) && !(x > 21 && x % 6 === 4) ) : ((x * 7 + y * 13 + x * y) % 3 === 0); return on ? <rect key={k} x={x} y={y} width="1" height="1" fill="#111" /> : null; })}
          </svg>
          <div className="col" style={{ gap: 6 }}>
            <span className="muted small">Pix dinâmico de {brl(v)}. Na versão final a confirmação chega sozinha pelo banco.</span>
            {pixOk ? <span className="ok"><b>Pagamento confirmado</b></span> : <button type="button" className="btn sm" onClick={() => setPixOk(true)}>Simular confirmação</button>}
          </div>
        </div>
      )}
      {metodo === 'fiado' && (
        <label className="field">Cliente do fiado
          <select className="input" value={clienteId} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Escolha o cliente</option>
            {s.clientes.map((c) => <option key={c.id} value={c.id}>{nomeCliente(c)} · deve {brl(c.fiado)} · limite {brl(c.limite)}</option>)}
          </select>
          {estouro && <span className="bad">Passa do limite de {brl(cl.limite)}. Precisa de autorização do gerente.</span>}
        </label>
      )}
      <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={nota} onChange={(e) => setNota(e.target.checked)} /> Emitir NFC-e ao fechar</label>
      {nota && <label className="field">CPF na nota (opcional)<input className="input" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" /></label>}
      <button type="button" className="btn primary big" disabled={!podePagar || (metodo === 'pix' && !pixOk) || (metodo === 'cartao' && !cartaoOk)} onClick={pagar}>
        {v >= t.falta - 0.001 ? 'Confirmar e fechar comanda' : 'Confirmar ' + brl(v) + ' e continuar'}
      </button>
    </Modal>
  );
}

export function Cardapio({ onAdd, qtdPorProduto = {} }) {
  const { s } = useStore();
  const [cat, setCat] = useState('Lanches');
  const [busca, setBusca] = useState('');
  const [esgModal, setEsgModal] = useState(false);
  const lista = useMemo(() => s.produtos.filter((p) => p.ativo && (busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : p.cat === cat)), [s.produtos, cat, busca]);
  const nEsg = s.produtos.filter((p) => p.ativo && p.esgotado).length;
  return (
    <div className="col">
      <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
        <label className="field grow">Buscar produto
          <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite o nome" />
        </label>
        <button type="button" className="btn" style={{ height: 44 }} onClick={() => setEsgModal(true)}>Esgotados{nEsg ? ' (' + nEsg + ')' : ''}</button>
      </div>
      {esgModal && <EsgotadosModal onClose={() => setEsgModal(false)} />}
      <div className="row wrap" style={{ gap: 8 }}>
        {CATEGORIAS.map((c) => <button key={c} type="button" className={'chip' + (!busca && cat === c ? ' on' : '')} onClick={() => { setCat(c); setBusca(''); }}>{c}</button>)}
      </div>
      <div className="prods">
        {lista.map((p) => (
          <button key={p.id} type="button" className={'prod' + (p.esgotado ? ' esg' : '')} disabled={p.esgotado} onClick={() => onAdd(p.id)}>
            {p.esgotado && <span className="esgtag">ESGOTADO</span>}
            <FotoProduto produto={p} tamanho={52} raio={10} style={p.esgotado ? { filter: 'grayscale(1)' } : undefined} />
            <span style={{ fontWeight: 600 }}>{p.nome}</span>
            <span className="p">{brl(p.preco)}</span>
            {qtdPorProduto[p.id] ? <span className="q">{qtdPorProduto[p.id]}</span> : null}
          </button>
        ))}
        {!lista.length && <div className="empty">Nenhum produto</div>}
      </div>
    </div>
  );
}

export function ItensComanda({ c, editavel = true }) {
  const { s, act } = useStore();
  const { usuario } = useOperador();
  const gestor = ehGestor(usuario);
  const [cancelando, setCancelando] = useState(null);
  const [pin, setPin] = useState('');
  return (
    <div className="col" style={{ gap: 0 }}>
      {!c.itens.length && <div className="empty">Comanda vazia. Toque nos produtos para adicionar.</div>}
      {c.itens.map((i) => {
        const [txt, cls] = i.destino === 'jogo' ? ['Jogo', 'muted'] : i.destino === 'bar' && i.status === 'enviado' ? ['Aguardando o bar', 'accent'] : STATUS_ITEM[i.status];
        return (
          <div key={i.id} className="list-item">
            <div className="col grow" style={{ gap: 4 }}>
              <span style={{ fontWeight: 600 }}>{i.qtd}× {i.nome}</span>
              <span className={'small ' + cls}>{txt}{i.obs ? ' · ' + i.obs : ''}</span>
              {editavel && i.status === 'pendente' && (
                <div className="row" style={{ gap: 6 }}>
                  <button type="button" className="qtybtn" onClick={() => act((d) => A.qtdItem(d, c.id, i.id, -1))} aria-label="Diminuir">−</button>
                  <button type="button" className="qtybtn" onClick={() => act((d) => A.qtdItem(d, c.id, i.id, 1))} aria-label="Aumentar">+</button>
                  <input className="input" style={{ height: 32, fontSize: 13 }} placeholder="Observação" value={i.obs} onChange={(e) => act((d) => A.obsItem(d, c.id, i.id, e.target.value))} />
                </div>
              )}
            </div>
            <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
              <span className="num" style={{ fontWeight: 600 }}>{brl(i.preco * i.qtd)}</span>
              {editavel && i.status !== 'pendente' && (
                <button type="button" className="btn sm ghost" onClick={() => setCancelando(i)}>Cancelar</button>
              )}
            </div>
          </div>
        );
      })}
      {cancelando && (
        <Modal titulo="Cancelar item" onClose={() => { setCancelando(null); setPin(''); }}>
          <span>{cancelando.qtd}× {cancelando.nome} · {brl(cancelando.preco * cancelando.qtd)}</span>
          {gestor ? <span className="muted">Você ({usuario.nome}) pode autorizar. O cancelamento fica registrado no seu nome.</span> : (
            <>
              <label className="field">PIN do gerente ou do dono para autorizar (protótipo: 1234)<input className="input" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus /></label>
              {pin.length >= 4 && !s.usuarios.some((u) => u.pin === pin && ehGestor(u)) && <span className="bad">PIN não autorizado</span>}
            </>
          )}
          <button type="button" className="btn danger big" disabled={!gestor && !s.usuarios.some((u) => u.pin === pin && ehGestor(u))} onClick={() => { const u = gestor ? usuario : s.usuarios.find((k) => k.pin === pin && ehGestor(k)); act((d) => A.cancelarItem(d, c.id, cancelando.id, u.nome)); setCancelando(null); setPin(''); }}>Confirmar cancelamento</button>
        </Modal>
      )}
    </div>
  );
}

export default function Caixa() {
  const { s, act } = useStore();
  const now = useNow(30000);
  const abertas = s.comandas.filter((c) => c.status === 'aberta');
  const rota = useRota();
  const [selId, setSel] = useState(rota.startsWith('caixa-') ? rota.slice(6) : abertas[0]?.id);
  useEffect(() => { if (rota.startsWith('caixa-')) setSel(rota.slice(6)); }, [rota]);
  const [busca, setBusca] = useState('');
  const [nova, setNova] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [msg, setMsg] = useState('');
  const [preConta, setPreConta] = useState(null);
  useEffect(() => {
    const abrir = () => { if (contaParaAbrir) { setSel(contaParaAbrir); setPreConta(contaParaAbrir); contaParaAbrir = null; } };
    abrir();
    window.addEventListener('bar24-abrir-conta', abrir);
    return () => window.removeEventListener('bar24-abrir-conta', abrir);
  }, []);
  const c = abertas.find((x) => x.id === selId);
  const cli = c && s.clientes.find((x) => x.id === c.clienteId);
  const t = c && totalComanda(c, s.config);
  const filtradas = abertas.filter((x) => {
    if (!busca) return true;
    const cl = s.clientes.find((k) => k.id === x.clienteId);
    return (x.numero + ' ' + nomeCliente(cl)).toLowerCase().includes(busca.toLowerCase());
  });
  const pend = c ? c.itens.filter((i) => i.status === 'pendente').reduce((a, i) => a + i.qtd, 0) : 0;
  const qtdPorProduto = {};
  c?.itens.filter((i) => i.status === 'pendente').forEach((i) => { qtdPorProduto[i.produtoId] = (qtdPorProduto[i.produtoId] || 0) + i.qtd; });

  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}>
          <h1>Frente de caixa</h1>
          <span className="muted">{s.caixa.aberto ? 'Turno de ' + s.caixa.operador + ' · ' : 'Caixa fechado · '}{abertas.length} comandas abertas</span>
        </div>
        <div className="row wrap"><Link className="btn" to="salao">Mapa do salão</Link><Link className="btn" to="turno">Turno e caixa</Link></div>
      </div>
      {!s.caixa.aberto && <div style={{ marginBottom: 16 }}><AbrirTurno compacto /></div>}
      <AcompanhaCozinha />
      <div className="caixa">
        <section className="card col" aria-label="Comandas abertas">
          <label className="field">Buscar comanda ou cliente<input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: 940 ou Goiote" /></label>
          <button type="button" className="btn primary" onClick={() => setNova(true)}>+ Nova comanda</button>
          <div className="cmds">
            {filtradas.map((x) => (
              <button key={x.id} type="button" className={'cmd' + (x.id === selId ? ' sel' : '') + (x.contaPedida ? ' conta' : '')} onClick={() => setSel(x.id)} title={x.contaPedida ? 'Pediu a conta' : ''}>{x.numero}</button>
            ))}
          </div>
          <div className="small muted row wrap"><span style={{ color: 'var(--warn)' }}>■</span> pediu a conta</div>
        </section>

        {c ? (
          <section className="card col" aria-label={'Comanda ' + c.numero}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="numbox">{c.numero}</div>
              <div className="col grow" style={{ gap: 4 }}>
                <b style={{ fontSize: 17 }}>{cli ? nomeCliente(cli) : 'Sem cliente'}{c.pessoas > 1 ? ' · ' + c.pessoas + ' pessoas' : ''}</b>
                <span className="small muted">{c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome + ' · ' : ''}Aberta há {desde(c.abertaEm, now)} · Garçom {c.garcom}</span>
                {cli && cli.fiado > 0 && <span className={'small ' + (cli.fiado >= cli.limite ? 'bad' : 'accent')}>Fiado: {brl(cli.fiado)} de {brl(cli.limite)}</span>}
                <div className="row wrap" style={{ gap: 6 }}>
                                    <button type="button" className="btn sm" onClick={() => act((d) => { const x = d.comandas.find((k) => k.id === c.id); x.servico = !x.servico; })}>{c.servico ? 'Tirar 10%' : 'Pôr 10%'}</button>
                </div>
              </div>
            </div>
            <ItensComanda c={c} />
            <div className="col" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div className="row between muted"><span>Subtotal</span><span className="num">{brl(t.sub)}</span></div>
              {c.servico && <div className="row between muted"><span>Serviço ({s.config.servico}%)</span><span className="num">{brl(t.serv)}</span></div>}
              {t.pago > 0 && <div className="row between ok"><span>Pago</span><span className="num">{brl(t.pago)}</span></div>}
              <div className="row between"><b>Total</b><b className="display num" style={{ fontSize: 28 }}>{brl(t.total)}</b></div>
            </div>
            {msg && <div className="small ok">{msg}</div>}
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" className="btn" disabled={!pend} onClick={() => { const n = act((d) => A.enviar(d, c.id, 'caixa')); setMsg(n + ' item(ns) enviados (cozinha recebe os pratos)'); setTimeout(() => setMsg(''), 3000); }}>Enviar pedido{pend ? ' (' + pend + ')' : ''}</button>
              <button type="button" className="btn" disabled={pend > 0 || !t.falta} onClick={() => { act((d) => A.emitirConta(d, c.id)); setPreConta(c.id); }}>Emitir conta</button>
            </div>
            {c.contaPedida && <button type="button" className="btn sm ghost" onClick={() => act((d) => { const x = d.comandas.find((k) => k.id === c.id); x.contaPedida = false; x.contaEmitidaEm = null; })}>Desmarcar "pediu a conta"</button>}
            <button type="button" className="btn primary big" disabled={!t.falta || pend > 0 || !s.caixa.aberto} onClick={() => setPagando(true)}>
              {!s.caixa.aberto ? 'Abra o turno para receber' : pend > 0 ? 'Envie os itens pendentes antes' : 'Receber ' + brl(t.falta)}
            </button>
          </section>
        ) : (
          <section className="card"><div className="empty">Escolha ou abra uma comanda</div></section>
        )}

        <section className="card" aria-label="Cardápio">
          {c ? <Cardapio qtdPorProduto={qtdPorProduto} onAdd={(pid) => act((d) => A.addItem(d, c.id, pid))} /> : <div className="empty">O cardápio aparece aqui com a comanda aberta</div>}
        </section>
      </div>
      {nova && <NovaComanda onClose={() => setNova(false)} onCriada={(id) => { setSel(id); setNova(false); }} />}
      {preConta && abertas.find((x) => x.id === preConta) && <PreConta comanda={abertas.find((x) => x.id === preConta)} onClose={() => setPreConta(null)} />}
      {pagando && c && <Pagamento comanda={c} onClose={(fechou) => { setPagando(false); if (fechou) setSel(abertas.find((x) => x.id !== c.id)?.id); }} />}
    </>
  );
}
