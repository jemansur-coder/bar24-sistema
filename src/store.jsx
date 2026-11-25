import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { seed, TIPOS_JOGO, MESAS_SALAO, DESCRICOES, completarInsumos, historicoEstoque, MOTIVOS_SAIDA } from './seed.js';

const NOVOS_USUARIOS = [
  { id: 'u-gilmar', nome: 'Gilmar', papel: 'Dono', pin: '5555', ativo: true },
  { id: 'u-ingrid', nome: 'Ingrid', papel: 'Gerente', pin: '6666', ativo: true },
];

// Estado do protótipo: fica no navegador (localStorage) e sincroniza entre abas,
// então a tela da parede ou a da cozinha aberta em outra aba/aparelho do mesmo navegador
// atualiza sozinha. Na versão final isso vira banco de dados + tempo real (WebSocket).
const KEY = 'bar24-dados-v1';
const Ctx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // migração de dados salvos por versões anteriores do protótipo
      if (!s.mesasSalao) {
        s.mesasSalao = MESAS_SALAO.map((m) => ({ ...m }));
        const liga = { 940: 'm1', 959: 'm5', 962: 'm2' };
        s.comandas.forEach((c) => { if (c.status === 'aberta' && liga[c.numero]) c.mesaId = liga[c.numero]; });
      }
      if (!s.fila) s.fila = [];
      if (!s.chamados) s.chamados = [];
      if (!s.avisosCozinha) s.avisosCozinha = [];
      if (!s.caixa.movs) {
        s.caixa.movs = [];
        if (s.caixa.sangrias) s.caixa.movs.push({ tipo: 'sangria', valor: s.caixa.sangrias, motivo: '', ts: Date.now(), por: s.caixa.operador });
        if (s.caixa.suprimentos) s.caixa.movs.push({ tipo: 'suprimento', valor: s.caixa.suprimentos, motivo: '', ts: Date.now(), por: s.caixa.operador });
        delete s.caixa.sangrias; delete s.caixa.suprimentos;
      }
      if (!s.turnos) s.turnos = [];
      // inclui Gilmar e Ingrid só se ainda não existir alguém com o mesmo nome (evita duplicar quem já foi cadastrado à mão)
      const mesmo = (a, b) => a.nome.trim().toLowerCase() === b.nome.trim().toLowerCase();
      NOVOS_USUARIOS.forEach((u) => {
        const outros = s.usuarios.filter((x) => mesmo(x, u) && x.id !== u.id);
        if (outros.length) s.usuarios = s.usuarios.filter((x) => x.id !== u.id);
        else if (!s.usuarios.some((x) => x.id === u.id)) s.usuarios.push({ ...u });
      });
      // remove repetidos com o mesmo nome e papel
      s.usuarios = s.usuarios.filter((u, k) => s.usuarios.findIndex((x) => mesmo(x, u) && x.papel === u.papel) === k);
      completarInsumos(s.insumos);
      if (!s.movsEstoque) { const h = historicoEstoque(s.insumos); s.movsEstoque = h.movs; s.contagens = h.contagens; s.alertasEstoque = h.alertas; }
      if (s.config.limiteDivergencia == null) s.config.limiteDivergencia = 20;
      s.produtos.forEach((p) => { if (p.descricao === undefined) p.descricao = DESCRICOES[p.id] || ''; });
      return s;
    }
  } catch (e) { /* sem storage */ }
  return seed();
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignora */ }
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY && e.newValue) setState(JSON.parse(e.newValue)); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const act = useCallback((fn) => {
    const draft = structuredClone(ref.current);
    const r = fn(draft);
    ref.current = draft;
    setState(draft);
    save(draft);
    return r;
  }, []);

  const reset = useCallback(() => { const s = seed(); ref.current = s; setState(s); save(s); }, []);

  return <Ctx.Provider value={{ s: state, act, reset }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

// ---------- quem está usando este aparelho ----------
let OPERADOR = null;
export const setOperadorAtual = (u) => { OPERADOR = u || null; };
export const quem = () => OPERADOR?.nome || 'Sistema';
export const ehGestor = (u) => !!u && ['Dono', 'Gerente'].includes(u.papel);

// ---------- formatação ----------
export const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const hora = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export function mmss(ms) {
  const neg = ms < 0; const sec = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const str = (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0');
  return neg ? '-' + str : str;
}
export const desde = (ts, now = Date.now()) => {
  const m = Math.max(0, Math.floor((now - ts) / 60000));
  return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0');
};
export const dias = (ts, now = Date.now()) => Math.floor((now - ts) / 86400000);
export const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 9);
export const METODOS = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix', fiado: 'Fiado' };
export const nomeCliente = (c) => (c ? c.nome + (c.apelido ? ' "' + c.apelido + '"' : '') : '');

// ---------- cálculos ----------
export function totalComanda(c, cfg) {
  const sub = c.itens.reduce((a, i) => a + i.preco * i.qtd, 0);
  const serv = c.servico ? Math.round(sub * (cfg?.servico ?? 10)) / 100 : 0;
  const pago = (c.pagamentos || []).reduce((a, p) => a + p.valor, 0);
  return { sub, serv, total: sub + serv, pago, falta: Math.max(0, Math.round((sub + serv - pago) * 100) / 100) };
}
export function estadoMesa(m, now, avisoMin = 5) {
  if (!m.sessao) return 'livre';
  const r = m.sessao.fim - now;
  if (r <= 0) return 'esgotado';
  if (r <= avisoMin * 60000) return 'acabando';
  return 'jogo';
}
export const tipoJogo = (id) => TIPOS_JOGO.find((t) => t.id === id);

export function sugestaoCompra(s) {
  return s.insumos.map((i) => {
    const f = s.fornecedores.find((x) => x.id === i.fornecedorId);
    const prazo = f?.prazoDias ?? 2;
    const diasRest = i.consumoDia ? i.estoque / i.consumoDia : 99;
    const alvo = i.consumoDia * (prazo + 7); // cobre o prazo de entrega + 1 semana
    const precisa = i.estoque <= i.minimo || diasRest <= prazo + 0.5;
    const qtd = Math.max(0, Math.ceil(alvo - i.estoque));
    return { ...i, fornecedor: f, prazo, diasRest, precisa: precisa && qtd > 0, qtd, valor: qtd * i.custo };
  });
}

// resumo do turno de caixa (aberto ou já fechado)
export function resumoTurno(s, t, ate = Date.now()) {
  const fim = t.fechadoEm || ate;
  const pags = s.pagamentos.filter((p) => p.ts >= t.abertoEm && p.ts <= fim);
  const porMetodo = { dinheiro: 0, cartao: 0, pix: 0, fiado: 0 };
  pags.forEach((p) => { porMetodo[p.metodo] = (porMetodo[p.metodo] || 0) + p.valor; });
  const movs = t.movs || [];
  const sangrias = movs.filter((m) => m.tipo === 'sangria').reduce((a, m) => a + m.valor, 0);
  const suprimentos = movs.filter((m) => m.tipo === 'suprimento').reduce((a, m) => a + m.valor, 0);
  const esperado = Math.round(((t.fundo || 0) + porMetodo.dinheiro + suprimentos - sangrias) * 100) / 100;
  const vendas = pags.filter((p) => p.tipo !== 'recebimento').reduce((a, p) => a + p.valor, 0);
  const cancel = s.log.filter((l) => l.ts >= t.abertoEm && l.ts <= fim && l.msg.startsWith('Cancelado'));
  return { pags, porMetodo, sangrias, suprimentos, esperado, vendas, cancel, fim };
}

// estado de cada mesa do salão para o mapa
export function estadoSalao(s, mesa, now = Date.now()) {
  const cmds = s.comandas.filter((c) => c.status === 'aberta' && c.mesaId === mesa.id);
  const chamando = s.chamados.some((c) => c.mesaId === mesa.id && !c.atendido && c.motivo !== 'conta');
  const conta = cmds.some((c) => c.contaPedida) || s.chamados.some((c) => c.mesaId === mesa.id && !c.atendido && c.motivo === 'conta');
  const pronto = cmds.some((c) => c.itens.some((i) => i.status === 'pronto'));
  const ultimo = Math.max(0, ...cmds.map((c) => Math.max(c.abertaEm, ...c.itens.map((i) => i.enviadoEm || 0))));
  const parado = cmds.length && now - ultimo > 40 * 60000;
  const total = cmds.reduce((a, c) => a + totalComanda(c, s.config).falta, 0);
  const estado = !cmds.length ? (chamando ? 'chamando' : 'livre') : chamando ? 'chamando' : conta ? 'conta' : pronto ? 'pronto' : parado ? 'parado' : 'ocupada';
  return { cmds, estado, ultimo, total, pessoas: cmds.reduce((a, c) => a + c.pessoas, 0) };
}

export const avisosAbertos = (s) => (s.avisosCozinha || []).filter((a) => a.status !== 'resolvido');

export function ticketsBar(s) {
  const out = [];
  for (const c of s.comandas) {
    if (c.status !== 'aberta') continue;
    const g = {};
    for (const i of c.itens) if (i.destino === 'bar' && i.status === 'enviado') (g[i.envio] = g[i.envio] || []).push(i);
    for (const [envio, itens] of Object.entries(g)) out.push({ c, envio, itens, ts: itens[0].enviadoEm });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

// pedidos prontos (cozinha ou bar) esperando o garçom levar à mesa. garcom = só as comandas dele
export function prontosParaLevar(s, garcom = null) {
  const out = [];
  for (const c of s.comandas) {
    if (c.status !== 'aberta' || (garcom && c.garcom !== garcom)) continue;
    const g = {};
    for (const i of c.itens) if (i.status === 'pronto') (g[i.envio + ':' + (i.destino === 'cozinha' ? 'cozinha' : 'bar')] = g[i.envio + ':' + (i.destino === 'cozinha' ? 'cozinha' : 'bar')] || []).push(i);
    for (const [k, itens] of Object.entries(g)) out.push({ c, envio: k.split(':')[0], origem: k.split(':')[1], itens, ts: Math.max(...itens.map((i) => i.prontoEm || 0)) });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

export function hoje(now = Date.now()) { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }

// ---------- ações ----------
export const A = {
  log(d, msg) { d.log.unshift({ ts: Date.now(), msg, por: quem() }); d.log = d.log.slice(0, 300); },

  novaComanda(d, { clienteId = null, garcom = quem(), pessoas = 1, rotulo = '', mesaId = null } = {}) {
    const numero = rotulo || String(d.seq++);
    const c = { id: uid('cm'), numero, mesaId, clienteId, garcom, abertaEm: Date.now(), pessoas, servico: true, status: 'aberta', contaPedida: false, itens: [], pagamentos: [] };
    d.comandas.push(c);
    return c.id;
  },
  addItem(d, comandaId, produtoId, qtd = 1, obs = '') {
    const c = d.comandas.find((x) => x.id === comandaId); const p = d.produtos.find((x) => x.id === produtoId);
    if (!c || !p || p.esgotado) return;
    const ex = c.itens.find((i) => i.produtoId === produtoId && i.status === 'pendente' && i.obs === obs);
    if (ex) ex.qtd += qtd;
    else c.itens.push({ id: uid('it'), produtoId, nome: p.nome, preco: p.preco, qtd, obs, destino: p.destino, status: 'pendente', envio: null, enviadoEm: null, por: quem() });
  },
  addAvulso(d, comandaId, nome, preco, destino = 'balcao') {
    const c = d.comandas.find((x) => x.id === comandaId); if (!c) return;
    c.itens.push({ id: uid('it'), produtoId: null, nome, preco, qtd: 1, obs: '', destino, status: 'entregue', envio: null, enviadoEm: Date.now() });
  },
  qtdItem(d, comandaId, itemId, delta) {
    const c = d.comandas.find((x) => x.id === comandaId); const i = c?.itens.find((x) => x.id === itemId);
    if (!i) return;
    i.qtd += delta;
    if (i.qtd <= 0) c.itens = c.itens.filter((x) => x.id !== itemId);
  },
  obsItem(d, comandaId, itemId, obs) {
    const i = d.comandas.find((x) => x.id === comandaId)?.itens.find((x) => x.id === itemId); if (i) i.obs = obs;
  },
  cancelarItem(d, comandaId, itemId, autorizou) {
    const c = d.comandas.find((x) => x.id === comandaId); const i = c?.itens.find((x) => x.id === itemId); if (!i) return;
    c.itens = c.itens.filter((x) => x.id !== itemId);
    if (i.status !== 'pendente') A.alertaEstoque(d, 'cancelamento', `${i.qtd}× ${i.nome} cancelado depois de sair ${i.destino === 'cozinha' ? 'da cozinha' : 'do bar'} (comanda ${c.numero}, garçom ${c.garcom})`, -i.preco * i.qtd, autorizou);
    A.log(d, `Cancelado ${i.qtd}× ${i.nome} da comanda ${c.numero} (${brl(i.preco * i.qtd)}) · pedido por ${quem()}${autorizou && autorizou !== quem() ? ', autorizado por ' + autorizou : ''}`);
  },
  // origem 'caixa': o próprio caixa já serve a bebida. 'salao' (garçom/QR): a bebida vai para a fila do bar e avisa o caixa.
  enviar(d, comandaId, origem = 'salao') {
    const c = d.comandas.find((x) => x.id === comandaId); if (!c) return 0;
    const pend = c.itens.filter((i) => i.status === 'pendente'); if (!pend.length) return 0;
    const envio = uid('e'); const t = Date.now();
    for (const i of pend) {
      i.envio = envio; i.enviadoEm = t;
      i.status = i.destino === 'cozinha' ? 'enviado' : origem === 'caixa' ? 'entregue' : 'enviado';
      // baixa automática de estoque pela ficha técnica
      const p = d.produtos.find((x) => x.id === i.produtoId);
      for (const [insId, q] of p?.ficha || []) {
        const ins = d.insumos.find((x) => x.id === insId); if (ins) { ins.estoque = Math.max(0, ins.estoque - q * i.qtd); A.mov(d, insId, 'venda', -q * i.qtd, { ref: 'Comanda ' + c.numero }); }
      }
    }
    return pend.length;
  },
  iniciarPreparo(d, comandaId, envio) {
    d.comandas.find((x) => x.id === comandaId)?.itens.forEach((i) => { if (i.envio === envio && i.destino === 'cozinha' && i.status === 'enviado') i.status = 'preparo'; });
  },
  pronto(d, comandaId, envio) {
    d.comandas.find((x) => x.id === comandaId)?.itens.forEach((i) => { if (i.envio === envio && i.destino === 'cozinha' && (i.status === 'enviado' || i.status === 'preparo')) { i.status = 'pronto'; i.prontoEm = Date.now(); } });
  },
  // bar separou a bebida: fica "pronto" e avisa o garçom da comanda para buscar no balcão
  barPronto(d, comandaId, envio) {
    d.comandas.find((x) => x.id === comandaId)?.itens.forEach((i) => { if (i.envio === envio && i.destino === 'bar' && i.status === 'enviado') { i.status = 'pronto'; i.prontoEm = Date.now(); } });
  },
  entregue(d, comandaId, envio, origem = null) {
    d.comandas.find((x) => x.id === comandaId)?.itens.forEach((i) => { if (i.envio === envio && i.status === 'pronto' && (!origem || (origem === 'cozinha') === (i.destino === 'cozinha'))) { i.status = 'entregue'; i.servidoEm = Date.now(); } });
  },
  pagar(d, comandaId, metodo, valor, clienteId) {
    const c = d.comandas.find((x) => x.id === comandaId); if (!c) return;
    c.pagamentos = c.pagamentos || [];
    c.pagamentos.push({ metodo, valor, clienteId });
    d.pagamentos.push({ id: uid('pg'), ts: Date.now(), metodo, valor, origem: 'Comanda ' + c.numero, clienteId: clienteId || null, tipo: 'venda', por: quem() });
    if (metodo === 'fiado') {
      const cl = d.clientes.find((x) => x.id === clienteId);
      if (cl) { if (!cl.fiado) cl.desde = Date.now(); cl.fiado = Math.round((cl.fiado + valor) * 100) / 100; }
    }
  },
  fecharComanda(d, comandaId, { nota = false, cpf = '' } = {}) {
    const c = d.comandas.find((x) => x.id === comandaId); if (!c) return;
    const t = totalComanda(c, d.config);
    c.status = 'fechada'; c.fechadaEm = Date.now();
    if (nota) d.notas.unshift({ id: uid('nf'), numero: String(1000 + d.notas.length + 1), tipo: 'NFC-e', ts: Date.now(), valor: t.total, cpf, comanda: c.numero, status: 'Autorizada (simulação)' });
  },
  receberFiado(d, clienteId, metodo, valor) {
    const cl = d.clientes.find((x) => x.id === clienteId); if (!cl) return;
    cl.fiado = Math.max(0, Math.round((cl.fiado - valor) * 100) / 100);
    if (!cl.fiado) cl.desde = null;
    d.pagamentos.push({ id: uid('pg'), ts: Date.now(), metodo, valor, origem: 'Recebimento de fiado · ' + cl.nome, clienteId, tipo: 'recebimento' });
  },
  iniciarJogo(d, mesaId, { jogo, jogadores, minutos, metodo, comandaId }) {
    const m = d.mesas.find((x) => x.id === mesaId); const t = tipoJogo(jogo); if (!m || !t) return;
    const valor = t.preco * jogadores; const now = Date.now();
    m.sessao = { jogo, jogadores, minutos, inicio: now, fim: now + minutos * 60000, valor, comandaId: comandaId || null, visto: false };
    const daFila = d.fila.find((x) => x.status === 'chamado' && x.mesaJogoId === mesaId);
    if (daFila) m.sessao.jogadorFila = daFila.nome;
    d.fila = d.fila.filter((x) => !(x.status === 'chamado' && x.mesaJogoId === mesaId));
    if (comandaId) A.addAvulso(d, comandaId, `${t.nome} ×${jogadores} · ${m.nome} · ${minutos} min`, valor, 'jogo');
    else d.pagamentos.push({ id: uid('pg'), ts: now, metodo, valor, origem: `Jogo ${t.nome} · ${m.nome}`, tipo: 'jogo' });
  },
  maisTempo(d, mesaId, minutos, metodo) {
    const m = d.mesas.find((x) => x.id === mesaId); if (!m?.sessao) return;
    const t = tipoJogo(m.sessao.jogo); const now = Date.now();
    const base = Math.max(now, m.sessao.fim);
    m.sessao.fim = base + minutos * 60000; m.sessao.minutos += minutos; m.sessao.visto = false;
    const valor = Math.round(t.preco * m.sessao.jogadores * (minutos / 30) * 100) / 100;
    m.sessao.valor += valor;
    if (m.sessao.comandaId && d.comandas.find((c) => c.id === m.sessao.comandaId && c.status === 'aberta')) A.addAvulso(d, m.sessao.comandaId, `+${minutos} min · ${m.nome}`, valor, 'jogo');
    else d.pagamentos.push({ id: uid('pg'), ts: now, metodo: metodo || 'dinheiro', valor, origem: `+${minutos} min · ${m.nome}`, tipo: 'jogo' });
  },
  encerrarJogo(d, mesaId) {
    const m = d.mesas.find((x) => x.id === mesaId); if (!m) return;
    m.sessao = null;
    A.chamarProximo(d, mesaId);
  },
  // ----- fila de jogos -----
  entrarFila(d, { nome, tel = '', tipo, jogadores }) {
    const f = { id: uid('fl'), nome, tel, tipo, jogadores, ts: Date.now(), status: 'aguardando', mesaJogoId: null };
    d.fila.push(f);
    // se já houver mesa livre do tipo, chama na hora
    const livre = d.mesas.find((m) => m.tipo === tipo && !m.sessao && !d.fila.some((x) => x.status === 'chamado' && x.mesaJogoId === m.id));
    if (livre) A.chamarProximo(d, livre.id);
    return f.id;
  },
  chamarProximo(d, mesaId) {
    const m = d.mesas.find((x) => x.id === mesaId); if (!m || m.sessao) return null;
    if (d.fila.some((x) => x.status === 'chamado' && x.mesaJogoId === mesaId)) return null;
    const prox = d.fila.filter((x) => x.status === 'aguardando' && x.tipo === m.tipo).sort((a, b) => a.ts - b.ts)[0];
    if (!prox) return null;
    prox.status = 'chamado'; prox.mesaJogoId = mesaId; prox.chamadoEm = Date.now();
    return prox.id;
  },
  sairFila(d, filaId) { d.fila = d.fila.filter((x) => x.id !== filaId); },
  // ----- chamados do cliente (QR Code da mesa) -----
  chamarGarcom(d, { mesaId, motivo, itens = [], obs = '' }) {
    if (d.chamados.some((c) => c.mesaId === mesaId && c.motivo === motivo && !c.atendido && !itens.length)) return;
    d.chamados.push({ id: uid('ch'), mesaId, motivo, itens, obs, ts: Date.now(), atendido: false });
  },
  atenderChamado(d, chId, { lancar = false, garcom = 'Joana' } = {}) {
    const ch = d.chamados.find((x) => x.id === chId); if (!ch) return;
    ch.atendido = true; ch.atendidoEm = Date.now();
    if (lancar && ch.itens.length) {
      let c = d.comandas.find((x) => x.status === 'aberta' && x.mesaId === ch.mesaId);
      if (!c) { const id = A.novaComanda(d, { garcom }); c = d.comandas.find((x) => x.id === id); c.mesaId = ch.mesaId; }
      for (const it of ch.itens) A.addItem(d, c.id, it.produtoId, it.qtd, it.obs || '');
      A.enviar(d, c.id);
    }
    if (ch.motivo === 'conta') { const c = d.comandas.find((x) => x.status === 'aberta' && x.mesaId === ch.mesaId); if (c) c.contaPedida = true; }
  },
  // ----- produto esgotado -----
  esgotar(d, produtoId, esgotado) {
    const p = d.produtos.find((x) => x.id === produtoId); if (!p) return;
    p.esgotado = esgotado; p.esgotadoEm = esgotado ? Date.now() : null; p.esgotadoPor = esgotado ? quem() : null;
    A.log(d, `${p.nome} ${esgotado ? 'marcado como esgotado' : 'voltou ao cardápio'} por ${quem()}`);
  },
  // ----- turno de caixa -----
  movCaixa(d, tipo, valor, motivo = '') {
    d.caixa.movs.push({ tipo, valor, motivo, ts: Date.now(), por: quem() });
    A.log(d, `${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} de ${brl(valor)}${motivo ? ' (' + motivo + ')' : ''} por ${quem()}`);
  },
  fecharTurno(d, { contado, notas = {}, obs = '' }) {
    if (!d.caixa.aberto) return null;
    const r = resumoTurno(d, d.caixa);
    const t = { ...d.caixa, id: uid('tu'), aberto: false, fechadoEm: Date.now(), fechadoPor: quem(), contado, notas, obs, esperado: r.esperado, diferenca: Math.round((contado - r.esperado) * 100) / 100 };
    d.turnos.unshift(t);
    d.caixa = { aberto: false, movs: [], fundoSugerido: Math.min(contado, d.caixa.fundo || 200) };
    A.log(d, `Caixa fechado por ${quem()}: contado ${brl(contado)}, esperado ${brl(r.esperado)}${Math.abs(t.diferenca) >= 0.01 ? ', diferença ' + brl(t.diferenca) : ', conferiu'}`);
    return t.id;
  },
  abrirTurno(d, { fundo }) {
    d.caixa = { aberto: true, abertoEm: Date.now(), operador: quem(), fundo, movs: [] };
    A.log(d, `Caixa aberto por ${quem()} com fundo de ${brl(fundo)}`);
  },
  // ----- mapa do salão -----
  trocarMesa(d, comandaId, mesaId) {
    const c = d.comandas.find((x) => x.id === comandaId); if (!c) return;
    const de = d.mesasSalao.find((m) => m.id === c.mesaId)?.nome || 'balcão';
    const para = d.mesasSalao.find((m) => m.id === mesaId)?.nome || 'balcão';
    d.chamados.forEach((ch) => { if (!ch.atendido && ch.mesaId === c.mesaId) ch.mesaId = mesaId; });
    c.mesaId = mesaId || null;
    A.log(d, `Comanda ${c.numero} trocou de ${de} para ${para} (${quem()})`);
  },
  juntarComandas(d, origemId, destinoId) {
    const o = d.comandas.find((x) => x.id === origemId); const t = d.comandas.find((x) => x.id === destinoId);
    if (!o || !t || o === t) return;
    t.itens.push(...o.itens);
    t.pagamentos = [...(t.pagamentos || []), ...(o.pagamentos || [])];
    t.pessoas += o.pessoas; t.contaPedida = t.contaPedida || o.contaPedida;
    if (!t.clienteId) t.clienteId = o.clienteId;
    d.mesas.forEach((m) => { if (m.sessao?.comandaId === o.id) m.sessao.comandaId = t.id; });
    o.itens = []; o.pagamentos = []; o.status = 'unida'; o.unidaEm = Date.now(); o.unidaA = t.numero;
    A.log(d, `Comanda ${o.numero} juntada na comanda ${t.numero} (${quem()})`);
  },
  // itens: [{ itemId, qtd }]. destino: id de comanda aberta, ou { mesaId } para abrir comanda nova
  transferirItens(d, origemId, itens, destino) {
    const o = d.comandas.find((x) => x.id === origemId); if (!o) return null;
    let t;
    if (typeof destino === 'string') t = d.comandas.find((x) => x.id === destino);
    else { const id = A.novaComanda(d, { mesaId: destino.mesaId || null, garcom: o.garcom }); t = d.comandas.find((x) => x.id === id); }
    if (!t || t === o) return null;
    const nomes = [];
    for (const { itemId, qtd } of itens) {
      const i = o.itens.find((x) => x.id === itemId); if (!i || qtd <= 0) continue;
      const q = Math.min(qtd, i.qtd);
      if (q === i.qtd) { o.itens = o.itens.filter((x) => x !== i); t.itens.push(i); }
      else { i.qtd -= q; t.itens.push({ ...i, id: uid('it'), qtd: q }); }
      nomes.push(q + '× ' + i.nome);
    }
    A.log(d, `Transferido ${nomes.join(', ')} da comanda ${o.numero} para ${t.numero} (${quem()})`);
    return t.id;
  },
  // cozinha → bar: chamado sobre qualquer assunto
  avisarBar(d, { motivo, texto = '', comandaNum = '' }) {
    d.avisosCozinha.push({ id: uid('av'), motivo, texto, comandaNum, quem: quem(), ts: Date.now(), status: 'aberto' });
  },
  vistoAviso(d, id) {
    const a = d.avisosCozinha.find((x) => x.id === id); if (!a || a.status !== 'aberto') return;
    a.status = 'visto'; a.vistoEm = Date.now(); a.vistoPor = quem();
  },
  resolverAviso(d, id) {
    const a = d.avisosCozinha.find((x) => x.id === id); if (!a) return;
    a.status = 'resolvido'; a.resolvidoEm = Date.now();
  },
  pagarPeloCelular(d, comandaId, valor, nome) {
    A.pagar(d, comandaId, 'pix', valor, null);
    const c = d.comandas.find((x) => x.id === comandaId);
    const p = d.pagamentos[d.pagamentos.length - 1]; p.origem = 'Pix pelo celular · ' + (nome || 'cliente') + ' · Comanda ' + c.numero;
    c.pagamentos[c.pagamentos.length - 1].nome = nome;
    if (totalComanda(c, d.config).falta <= 0.001) A.fecharComanda(d, comandaId, { nota: true });
  },
  silenciar(d, mesaId) { const m = d.mesas.find((x) => x.id === mesaId); if (m?.sessao) m.sessao.visto = true; },
  gerarPedidosCompra(d, itens) {
    const porForn = {};
    for (const i of itens) (porForn[i.fornecedorId] = porForn[i.fornecedorId] || []).push({ insumoId: i.id, nome: i.nome, qtd: i.qtd, un: i.un, custo: i.custo });
    for (const [fid, linhas] of Object.entries(porForn)) {
      d.pedidosCompra.unshift({ id: uid('pc'), numero: 'PC-' + String(d.pedidosCompra.length + 1).padStart(4, '0'), fornecedorId: fid, ts: Date.now(), status: 'enviado', linhas, valor: linhas.reduce((a, l) => a + l.qtd * l.custo, 0) });
    }
  },
  // entrada conferida: compara o que chegou com o pedido. recebidos = { insumoId: qtd }
  receberPedido(d, pcId, recebidos = null, nf = '') {
    const pc = d.pedidosCompra.find((x) => x.id === pcId); if (!pc || pc.status === 'recebido') return;
    const difs = [];
    for (const l of pc.linhas) {
      const q = recebidos ? Number(recebidos[l.insumoId] ?? l.qtd) : l.qtd;
      l.recebido = q;
      const fq = (v) => (l.un === 'ml' ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' L' : l.un === 'g' ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' kg' : v + ' ' + l.un);
      if (Math.abs(q - l.qtd) > 0.001) difs.push(`${l.nome}: pedido ${fq(l.qtd)}, chegou ${fq(q)}`);
      const i = d.insumos.find((x) => x.id === l.insumoId);
      if (i && q > 0) { i.estoque += q; A.mov(d, i.id, 'entrada', q, { ref: pc.numero + (nf ? ' · NF ' + nf : ''), obs: difs.length ? 'Diferença no recebimento' : 'Conferido com o pedido' }); }
    }
    pc.status = 'recebido'; pc.recebidoEm = Date.now(); pc.recebidoPor = quem(); pc.nf = nf; pc.divergencias = difs;
    if (difs.length) A.alertaEstoque(d, 'entrada', `Entrada ${pc.numero} recebida por ${quem()} com diferença: ${difs.join('; ')}`, 0);
  },
  // ---------- controle de estoque ----------
  mov(d, insumoId, tipo, qtd, extra = {}) {
    const i = d.insumos.find((x) => x.id === insumoId);
    d.movsEstoque.push({ id: uid('mv'), ts: Date.now(), insumoId, tipo, qtd, saldo: i ? i.estoque : null, por: quem(), ...extra });
    if (d.movsEstoque.length > 4000) d.movsEstoque = d.movsEstoque.slice(-4000);
  },
  alertaEstoque(d, tipo, texto, valor = 0, autorizou = '') {
    d.alertasEstoque.unshift({ id: uid('al'), ts: Date.now(), tipo, texto, valor, por: quem(), autorizou, visto: false });
    d.alertasEstoque = d.alertasEstoque.slice(0, 200);
  },
  vistoAlertaEstoque(d, id) { const a = d.alertasEstoque.find((x) => x.id === id); if (a) { a.visto = true; a.vistoPor = quem(); } },
  // saída sem venda (perda, quebra, consumo, cortesia): sempre com motivo e autorização do gerente
  saidaEstoque(d, insumoId, qtd, motivo, obs, autorizou) {
    const i = d.insumos.find((x) => x.id === insumoId); if (!i || !(qtd > 0)) return;
    i.estoque = Math.max(0, i.estoque - qtd);
    A.mov(d, insumoId, motivo, -qtd, { obs, autorizou });
    const nome = (MOTIVOS_SAIDA.find((m) => m[0] === motivo) || [, motivo])[1];
    A.log(d, `Saída de estoque: ${qtd} ${i.un} de ${i.nome} · ${nome}${obs ? ' · ' + obs : ''} · autorizado por ${autorizou}`);
    if (qtd * i.custo >= d.config.limiteDivergencia) A.alertaEstoque(d, 'saida', `Saída sem venda: ${qtd} ${i.un} de ${i.nome} (${nome}) por ${quem()}, autorizada por ${autorizou}`, -qtd * i.custo, autorizou);
  },
  entradaAvulsa(d, insumoId, qtd, obs) {
    const i = d.insumos.find((x) => x.id === insumoId); if (!i || !(qtd > 0)) return;
    i.estoque += qtd; A.mov(d, insumoId, 'entrada', qtd, { obs: obs || 'Entrada sem pedido de compra' });
  },
  // contagem cega do fim do turno: contados = { insumoId: qtd }
  contagemTurno(d, contados) {
    const itens = [];
    for (const [insumoId, contado] of Object.entries(contados)) {
      const i = d.insumos.find((x) => x.id === insumoId); if (!i) continue;
      const esperado = Math.round(i.estoque * 100) / 100; const dif = Math.round((contado - esperado) * 100) / 100;
      itens.push({ insumoId, esperado, contado, dif, valor: dif * i.custo });
      if (dif) { i.estoque = contado; A.mov(d, insumoId, 'contagem', dif, { obs: 'Contagem do turno: ' + (dif < 0 ? 'faltou ' : 'sobrou ') + Math.abs(dif) + ' ' + i.un }); }
    }
    const ct = { id: uid('ct'), ts: Date.now(), por: quem(), turno: d.caixa.aberto ? d.caixa.operador : quem(), itens, valor: itens.reduce((a, x) => a + x.valor, 0) };
    d.contagens.unshift(ct);
    const ruins = itens.filter((x) => x.dif < 0);
    if (ruins.length && Math.abs(ruins.reduce((a, x) => a + x.valor, 0)) >= d.config.limiteDivergencia) {
      A.alertaEstoque(d, 'divergencia', `Contagem do turno de ${ct.turno}: faltaram ` + ruins.map((x) => { const i = d.insumos.find((k) => k.id === x.insumoId); return i.garrafaMl ? Math.round(-x.dif / i.doseMl) + ' doses de ' + i.nome : -x.dif + ' ' + i.nome; }).join(', '), ruins.reduce((a, x) => a + x.valor, 0));
    }
    return ct.id;
  },
};
