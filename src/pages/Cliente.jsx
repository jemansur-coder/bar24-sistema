import { useEffect, useRef, useState } from 'react';
import { A, brl, estadoMesa, relogioMesa, totalComanda, useNow, useStore } from '../store.jsx';
import { CATEGORIAS } from '../seed.js';
import { Logo, Modal, TemaBtn, bip } from '../ui.jsx';
import { QR } from '../qr.jsx';
import { FotoProduto } from '../fotos.jsx';

// Telas do CLIENTE, abertas pelo QR Code da mesa (#mesa-m5) ou da fila de jogos (#fila).
// Pensadas para celular.

const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignora */ } };
const lerLocal = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };

function Topo({ titulo, sub }) {
  return (
    <header className="row between" style={{ padding: '16px 0' }}>
      <div className="row" style={{ gap: 10 }}>
        <Logo size={40} />
        <div className="col" style={{ gap: 0 }}>
          <b className="display" style={{ fontSize: 20 }}>{titulo}</b>
          <span className="small muted">{sub}</span>
        </div>
      </div>
      <TemaBtn className="btn sm ghost" />
    </header>
  );
}

function Cardapio({ mesa }) {
  const { s, act } = useStore();
  const [cat, setCat] = useState(CATEGORIAS[0]);
  const [carrinho, setCarrinho] = useState({});
  const [enviado, setEnviado] = useState('');
  const pend = s.chamados.filter((c) => c.mesaId === mesa.id && !c.atendido);
  const itens = Object.entries(carrinho).filter(([pid, q]) => q > 0 && !s.produtos.find((p) => p.id === pid)?.esgotado);
  const total = itens.reduce((a, [pid, q]) => a + q * (s.produtos.find((p) => p.id === pid)?.preco || 0), 0);
  const mudar = (pid, d) => setCarrinho({ ...carrinho, [pid]: Math.max(0, (carrinho[pid] || 0) + d) });
  const chamar = (motivo, lista = []) => {
    const r = act((d) => A.chamarGarcom(d, { mesaId: mesa.id, motivo, itens: lista }));
    setEnviado(r === 'direto' ? 'Pedido enviado! Os pratos já estão na tela da cozinha e as bebidas no bar.' : motivo === 'pedido' ? 'Pedido enviado ao garçom. Ele confirma e já manda para a cozinha.' : motivo === 'conta' ? 'O garçom vai trazer a conta.' : 'O garçom foi chamado.');
    if (motivo === 'pedido') setCarrinho({});
    setTimeout(() => setEnviado(''), 6000);
  };
  return (
    <div className="col" style={{ gap: 16, paddingBottom: itens.length ? 120 : 24 }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" className="btn primary big" onClick={() => chamar('garcom')}>Chamar garçom</button>
        <button type="button" className="btn big" onClick={() => chamar('conta')}>Pedir a conta</button>
      </div>
      {(enviado || pend.length > 0) && <div className="card tight" style={{ borderColor: 'var(--ok)', background: 'var(--ok-soft)' }}><b className="ok">{enviado || 'Garçom chamado, já está vindo.'}</b></div>}
      <SeusPedidos mesa={mesa} />
      <div className="row" style={{ gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIAS.map((c) => <button key={c} type="button" className={'chip' + (cat === c ? ' on' : '')} style={{ flex: 'none' }} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="col" style={{ gap: 0 }}>
        {s.produtos.filter((p) => p.ativo && p.cat === cat).map((p) => (
          <div key={p.id} className="list-item" style={{ gap: 12 }}>
            <div className="row grow" style={{ gap: 12, minWidth: 0 }}>
              <FotoProduto produto={p} tamanho={76} raio={14} style={p.esgotado ? { filter: 'grayscale(1)', opacity: 0.6 } : undefined} />
              <div className="col" style={{ gap: 2, minWidth: 0 }}><b>{p.nome}</b>{p.descricao && <span className="small muted">{p.descricao}</span>}<span className="accent display" style={{ fontWeight: 700 }}>{brl(p.preco)}</span></div>
            </div>
            {p.esgotado ? <span className="pill off">Esgotado</span> : <div className="row" style={{ gap: 8 }}>
              {carrinho[p.id] > 0 && <><button type="button" className="qtybtn" style={{ width: 40, height: 40 }} aria-label={'Tirar ' + p.nome} onClick={() => mudar(p.id, -1)}>−</button><b style={{ minWidth: 16, textAlign: 'center' }}>{carrinho[p.id]}</b></>}
              <button type="button" className="qtybtn" style={{ width: 40, height: 40, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none' }} aria-label={'Adicionar ' + p.nome} onClick={() => mudar(p.id, 1)}>+</button>
            </div>}
          </div>
        ))}
      </div>
      {itens.length > 0 && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px max(16px, env(safe-area-inset-left, 0px)) calc(12px + env(safe-area-inset-bottom, 0px))', background: 'var(--bg-2)', borderTop: '1px solid var(--line)', zIndex: 20 }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }} className="col">
            <span className="small muted">{itens.map(([pid, q]) => q + '× ' + s.produtos.find((p) => p.id === pid)?.nome).join(', ')}</span>
            <button type="button" className="btn primary big" onClick={() => chamar('pedido', itens.map(([produtoId, qtd]) => ({ produtoId, qtd })))}>{s.comandas.some((c) => c.status === 'aberta' && c.mesaId === mesa.id) ? 'Fazer pedido' : 'Enviar pedido ao garçom'} · {brl(total)}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// acompanhamento do pedido pelo cliente: na fila, em preparo, pronto, entregue
const STATUS_CLIENTE = { enviado: ['Recebido', 'muted'], preparo: ['Em preparo', 'accent'], pronto: ['Pronto, já está vindo', 'ok'], entregue: ['Entregue', 'muted'] };
function SeusPedidos({ mesa }) {
  const { s } = useStore();
  const c = s.comandas.find((x) => x.status === 'aberta' && x.mesaId === mesa.id);
  const agora = useNow(5000);
  const itens = (c?.itens || []).filter((i) => i.destino !== 'jogo' && i.status !== 'pendente' && (i.status !== 'entregue' || agora - (i.servidoEm || 0) < 10 * 60000) && agora - (i.enviadoEm || 0) < 90 * 60000);
  if (!itens.length) return null;
  return (
    <div className="card tight col" style={{ gap: 6 }} aria-label="Seus pedidos">
      <b className="small muted">SEUS PEDIDOS</b>
      {itens.map((i) => {
        const [txt, cls] = i.destino === 'bar' && i.status === 'enviado' ? ['Separando no bar', 'accent'] : i.destino === 'cozinha' && i.status === 'enviado' ? ['Na fila da cozinha', 'muted'] : STATUS_CLIENTE[i.status] || ['', 'muted'];
        return <div key={i.id} className="row between"><span>{i.qtd}× {i.nome}</span><b className={'small ' + cls}>{txt}</b></div>;
      })}
    </div>
  );
}

function PagarPix({ comanda, valor, onClose }) {
  const { act } = useStore();
  const [nome, setNome] = useState(lerLocal('bar24-meu-nome'));
  const [pago, setPago] = useState(false);
  const codigo = `00020126580014BR.GOV.BCB.PIX0136bar24horas-exemplo5204000053039865406${valor.toFixed(2)}5802BR5913BAR 24 HORAS6009SAO PAULO62070503***6304ABCD`;
  if (pago) return (
    <Modal titulo="Pagamento confirmado" onClose={onClose}>
      <b className="ok" style={{ fontSize: 18 }}>Recebemos {brl(valor)}. Obrigado, {nome || 'volte sempre'}!</b>
      <button type="button" className="btn primary big" onClick={onClose}>Voltar à conta</button>
    </Modal>
  );
  return (
    <Modal titulo={'Pagar ' + brl(valor) + ' no Pix'} onClose={onClose}>
      <label className="field" htmlFor="pix-nome">Seu nome (aparece na conta da mesa)
        <input id="pix-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: João" />
      </label>
      <div className="row" style={{ justifyContent: 'center' }}><QR texto={codigo} tamanho={200} titulo="QR Code Pix de exemplo" /></div>
      <button type="button" className="btn" onClick={() => { try { navigator.clipboard.writeText(codigo); } catch (e) { /* ignora */ } }}>Copiar código Pix</button>
      <span className="small muted">Protótipo: o Pix é de exemplo. Na versão final o banco confirma o pagamento sozinho.</span>
      <button type="button" className="btn primary big" onClick={() => { guardar('bar24-meu-nome', nome); act((d) => A.pagarPeloCelular(d, comanda.id, valor, nome)); setPago(true); }}>Simular pagamento confirmado</button>
    </Modal>
  );
}

function Conta({ mesa }) {
  const { s, act } = useStore();
  const c = s.comandas.find((x) => x.status === 'aberta' && x.mesaId === mesa.id);
  const [pessoas, setPessoas] = useState(c?.pessoas || 2);
  const [outro, setOutro] = useState('');
  const [pagar, setPagar] = useState(null);
  if (!c) return <div className="empty">Nenhuma conta aberta nesta mesa. Faça seu pedido pelo cardápio ou chame o garçom.</div>;
  const t = totalComanda(c, s.config);
  const pediu = c.contaPedida || s.chamados.some((x) => x.mesaId === mesa.id && x.motivo === 'conta' && !x.atendido);
  const parte = Math.min(t.falta, Math.ceil((t.total / pessoas) * 100) / 100);
  const vOutro = Math.min(t.falta, parseFloat(outro.replace(',', '.')) || 0);
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="card col" style={{ gap: 0 }}>
        {c.itens.filter((i) => i.status !== 'pendente').map((i) => (
          <div key={i.id} className="list-item"><span>{i.qtd}× {i.nome}</span><span className="num">{brl(i.preco * i.qtd)}</span></div>
        ))}
        <div className="col" style={{ gap: 4, paddingTop: 12 }}>
          <div className="row between muted"><span>Subtotal</span><span className="num">{brl(t.sub)}</span></div>
          {c.servico && <div className="row between muted"><span>Serviço ({s.config.servico}%)</span><span className="num">{brl(t.serv)}</span></div>}
          <div className="row between"><b>Total</b><b className="display num" style={{ fontSize: 24 }}>{brl(t.total)}</b></div>
          {(c.pagamentos || []).map((p, k) => <div key={k} className="row between ok small"><span>Pago {p.nome ? 'por ' + p.nome : ''} ({p.metodo === 'pix' ? 'Pix' : p.metodo})</span><span className="num">−{brl(p.valor)}</span></div>)}
          <div className="row between"><b>Falta pagar</b><b className="display num accent" style={{ fontSize: 24 }}>{brl(t.falta)}</b></div>
        </div>
      </div>
      {t.falta > 0 && (c.contaEmitidaEm
        ? <div className="card tight" style={{ borderColor: 'var(--ok)', background: 'var(--ok-soft)' }}><b className="ok">{c.contaEntregueEm ? 'Sua conta foi entregue. Pague com o garçom na maquininha ou no Pix aqui.' : 'Conta emitida pelo caixa. O garçom ' + c.garcom + ' já está trazendo.'}</b></div>
        : <button type="button" className="btn primary big" disabled={pediu} onClick={() => act((d) => A.chamarGarcom(d, { mesaId: mesa.id, motivo: 'conta' }))}>{pediu ? 'Conta pedida, aguarde o garçom' : 'Pedir a conta'}</button>)}
      {t.falta > 0 && (
        <div className="card col">
          <h2>Dividir a conta</h2>
          <div className="row between">
            <span>Pessoas na mesa</span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="qtybtn" style={{ width: 40, height: 40 }} aria-label="Menos uma pessoa" onClick={() => setPessoas(Math.max(1, pessoas - 1))}>−</button>
              <b className="display" style={{ fontSize: 22, minWidth: 24, textAlign: 'center' }}>{pessoas}</b>
              <button type="button" className="qtybtn" style={{ width: 40, height: 40 }} aria-label="Mais uma pessoa" onClick={() => setPessoas(pessoas + 1)}>+</button>
            </div>
          </div>
          <div className="row between"><span className="muted">Parte de cada um</span><b className="display num" style={{ fontSize: 22 }}>{brl(parte)}</b></div>
          <button type="button" className="btn primary big" onClick={() => setPagar(parte)}>Pagar minha parte no Pix</button>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" inputMode="decimal" placeholder="Outro valor" aria-label="Pagar outro valor" value={outro} onChange={(e) => setOutro(e.target.value)} />
            <button type="button" className="btn" disabled={!vOutro} onClick={() => setPagar(vOutro)}>Pagar</button>
          </div>
          <button type="button" className="btn ghost" onClick={() => setPagar(t.falta)}>Pagar tudo ({brl(t.falta)})</button>
        </div>
      )}
      {pagar && <PagarPix comanda={c} valor={pagar} onClose={() => setPagar(null)} />}
    </div>
  );
}

export function FilaJogos() {
  const { s, act } = useStore();
  const now = useNow(1000);
  const [meuId, setMeuId] = useState(lerLocal('bar24-minha-fila'));
  const [nome, setNome] = useState(lerLocal('bar24-meu-nome'));
  const [tipo, setTipo] = useState('sinuca');
  const [jogadores, setJogadores] = useState(2);
  const eu = s.fila.find((x) => x.id === meuId);
  const minhaMesaAgora = !eu && meuId ? s.mesas.find((m) => m.sessao?.jogadorFila && m.sessao.jogadorFila === nome) : null;
  const avisado = useRef(false);
  useEffect(() => {
    if (eu?.status === 'chamado' && !avisado.current) { avisado.current = true; bip(880, 0.25, 4); try { navigator.vibrate?.([300, 150, 300]); } catch (e) { /* ignora */ } }
  }, [eu?.status]);
  const posicao = eu && eu.status === 'aguardando' ? s.fila.filter((x) => x.tipo === eu.tipo && x.status === 'aguardando' && x.ts <= eu.ts).length : 0;
  const mesaChamada = eu?.mesaJogoId && s.mesas.find((m) => m.id === eu.mesaJogoId);

  return (
    <div className="col" style={{ gap: 16 }}>
      {eu?.status === 'chamado' && (
        <div className="card col" style={{ background: 'var(--ok)', borderColor: 'var(--ok)', color: '#fff', animation: 'none' }} role="alert">
          <b className="display" style={{ fontSize: 28 }}>É a sua vez!</b>
          <span style={{ fontSize: 18 }}>Vá para a <b>{mesaChamada?.nome}</b> e confirme com o caixa.</span>
        </div>
      )}
      {eu?.status === 'aguardando' && (
        <div className="card accent-b col">
          <span className="muted">Você está na fila da {eu.tipo === 'sinuca' ? 'sinuca' : 'mesa de cartas'}</span>
          <b className="display" style={{ fontSize: 40 }}>{posicao}º lugar</b>
          <span className="small muted">Deixe esta tela aberta: avisamos aqui e na TV da parede quando chegar a sua vez.</span>
          <button type="button" className="btn ghost" onClick={() => { act((d) => A.sairFila(d, eu.id)); guardar('bar24-minha-fila', null); setMeuId(''); }}>Sair da fila</button>
        </div>
      )}
      {minhaMesaAgora && <div className="card tight"><b className="ok">Bom jogo na {minhaMesaAgora.nome}!</b></div>}
      {!eu && (
        <div className="card col">
          <h2>Entrar na fila</h2>
          <label className="field" htmlFor="fila-nome">Seu nome<input id="fila-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como chamamos você" /></label>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" className={'btn' + (tipo === 'sinuca' ? ' sel' : '')} onClick={() => setTipo('sinuca')}>Sinuca</button>
            <button type="button" className={'btn' + (tipo === 'cartas' ? ' sel' : '')} onClick={() => setTipo('cartas')}>Cartas</button>
          </div>
          <div className="row between">
            <span>Jogadores</span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="qtybtn" style={{ width: 40, height: 40 }} aria-label="Menos um jogador" onClick={() => setJogadores(Math.max(1, jogadores - 1))}>−</button>
              <b className="display" style={{ fontSize: 22, minWidth: 24, textAlign: 'center' }}>{jogadores}</b>
              <button type="button" className="qtybtn" style={{ width: 40, height: 40 }} aria-label="Mais um jogador" onClick={() => setJogadores(jogadores + 1)}>+</button>
            </div>
          </div>
          <button type="button" className="btn primary big" disabled={!nome.trim()} onClick={() => { const id = act((d) => A.entrarFila(d, { nome: nome.trim(), tipo, jogadores })); guardar('bar24-minha-fila', id); guardar('bar24-meu-nome', nome.trim()); setMeuId(id); avisado.current = false; }}>Entrar na fila</button>
        </div>
      )}
      <div className="card col" style={{ gap: 0 }}>
        <h2 style={{ marginBottom: 8 }}>Mesas agora</h2>
        {s.mesas.map((m) => {
          const e = estadoMesa(m, now, s.config.avisoMin);
          return <div key={m.id} className="list-item"><span>{m.nome}</span><b className={'num ' + (e === 'livre' ? 'ok' : e === 'esgotado' ? 'bad' : '')}>{e === 'livre' ? 'Livre' : e === 'esgotado' ? 'Acabando' : (m.sessao.jogo === 'ficha' ? 'em jogo · ' + relogioMesa(m, now) : 'faltam ' + relogioMesa(m, now))}</b></div>;
        })}
      </div>
      <div className="card col" style={{ gap: 0 }}>
        <h2 style={{ marginBottom: 8 }}>Fila</h2>
        {!s.fila.length && <span className="muted">Ninguém na fila.</span>}
        {['sinuca', 'cartas'].map((tp) => s.fila.filter((x) => x.tipo === tp).sort((a, b) => a.ts - b.ts).map((x, k) => (
          <div key={x.id} className="list-item"><span>{tp === 'sinuca' ? 'Sinuca' : 'Cartas'} · {k + 1}º {x.nome}{x.id === meuId ? ' (você)' : ''}</span><span className={x.status === 'chamado' ? 'ok' : 'muted'}>{x.status === 'chamado' ? 'Chamado' : x.jogadores + ' jog.'}</span></div>
        )))}
      </div>
    </div>
  );
}

// depois que a conta é paga, o tablet agradece por alguns minutos
function Despedida({ mesa }) {
  const { s } = useStore();
  const agora = useNow(10000);
  if (s.comandas.some((c) => c.status === 'aberta' && c.mesaId === mesa.id)) return null;
  const ultima = s.comandas.filter((c) => c.status === 'fechada' && c.mesaId === mesa.id && agora - (c.fechadaEm || 0) < 15 * 60000).sort((a, b) => b.fechadaEm - a.fechadaEm)[0];
  if (!ultima) return null;
  return (
    <div className="card col" style={{ marginBottom: 16, alignItems: 'center', textAlign: 'center', gap: 6, borderColor: 'var(--ok)', background: 'var(--ok-soft)' }}>
      <b className="display ok" style={{ fontSize: 26 }}>Conta paga. Obrigado!</b>
      <span>Foi um prazer receber vocês. Volte sempre, estamos abertos 24 horas.</span>
    </div>
  );
}

// Tablet fixo da mesa (modo quiosque, ex.: Fully Kiosk apontando para #mesa-<id>?quiosque=1):
// sem link para o sistema, volta sozinho ao cardápio depois de 2 min parado e mantém a tela acesa.
export const emQuiosque = () => { try { return /quiosque|kiosk/i.test(window.location.search + window.location.hash) || /Fully/i.test(navigator.userAgent); } catch (e) { return false; } };
function useQuiosque(voltar) {
  useEffect(() => {
    if (!emQuiosque()) return undefined;
    let lock = null;
    const pedir = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch (e) { /* sem wake lock */ } };
    pedir();
    const vis = () => { if (document.visibilityState === 'visible') pedir(); };
    let t = setTimeout(voltar, 120000);
    const mexeu = () => { clearTimeout(t); t = setTimeout(voltar, 120000); };
    ['pointerdown', 'keydown', 'scroll'].forEach((ev) => window.addEventListener(ev, mexeu, { passive: true }));
    document.addEventListener('visibilitychange', vis);
    return () => { clearTimeout(t); ['pointerdown', 'keydown', 'scroll'].forEach((ev) => window.removeEventListener(ev, mexeu)); document.removeEventListener('visibilitychange', vis); try { lock?.release(); } catch (e) { /* ignora */ } };
  }, []);
}

export function ClienteMesa({ mesaId }) {
  const { s } = useStore();
  const [aba, setAba] = useState('cardapio');
  useQuiosque(() => { setAba('cardapio'); window.scrollTo({ top: 0 }); });
  const quiosque = emQuiosque();
  const mesa = s.mesasSalao.find((m) => m.id === mesaId);
  if (!mesa) return <div className="main"><div className="empty">QR Code inválido. Fale com o garçom.</div></div>;
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px))', minHeight: '100vh' }}>
      <Topo titulo={mesa.nome} sub={s.config.nomeBar} />
      <Despedida mesa={mesa} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, marginBottom: 16 }}>
        {[['cardapio', 'Cardápio'], ['conta', 'Minha conta'], ['jogos', 'Jogos']].map(([k, l]) => <button key={k} type="button" className={'chip' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l}</button>)}
      </div>
      {aba === 'cardapio' && <Cardapio mesa={mesa} />}
      {aba === 'conta' && <Conta mesa={mesa} />}
      {aba === 'jogos' && <FilaJogos />}
      {quiosque ? <div style={{ height: 32 }} /> : <div className="small muted" style={{ textAlign: 'center', padding: 24 }}>Visão do cliente · <a href="#qrcodes">voltar ao sistema</a></div>}
    </div>
  );
}

export function ClienteFila() {
  const { s } = useStore();
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 max(16px, env(safe-area-inset-left, 0px))', minHeight: '100vh' }}>
      <Topo titulo="Fila de jogos" sub={s.config.nomeBar} />
      <FilaJogos />
      <div className="small muted" style={{ textAlign: 'center', padding: 24 }}>Visão do cliente · <a href="#jogos">voltar ao sistema</a></div>
    </div>
  );
}
