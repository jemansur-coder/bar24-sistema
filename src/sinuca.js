// Controle da sinuca POR FICHA (não por tempo), separado por mesa.
//
// Regras:
// - Cada ficha vale uma partida. O preço vem de config.precoFicha (padrão R$ 2,00).
// - Cada mesa de sinuca tem a sua sessão: fichas VENDIDAS (lançadas na comanda ou pagas na hora),
//   fichas USADAS (partidas liberadas) e o SALDO (vendidas e ainda não jogadas).
// - Todo lançamento fica registrado na sessão (quem lançou, quando, quantas, como foi cobrado).
// - Estorno de ficha só do saldo não jogado e só com PIN de gerente/dono.
// - Ao encerrar a mesa, o saldo não estornado conta como jogado e a sessão vai para s.historicoSinuca.
// - Conferência do cofre: compara as fichas contadas no cofre da mesa com as fichas usadas desde a
//   última conferência. Ficha a mais no cofre = partida jogada sem registro (alerta).
//
// Este arquivo só tem cálculos (sem React e sem alterar o estado). As ações ficam em store.jsx (A.*).

export const PRECO_FICHA_PADRAO = 2;
export const precoFicha = (s) => Number(s?.config?.precoFicha) || PRECO_FICHA_PADRAO;
export const ehFicha = (se) => se?.jogo === 'ficha';
export const saldoFichas = (se) => (ehFicha(se) ? Math.max(0, (se.fichas || 0) - (se.usadas || 0)) : 0);
export const mesasSinuca = (s) => s.mesas.filter((m) => m.tipo === 'sinuca');

// sessão nova de sinuca (sem fichas ainda; a venda vem logo em seguida)
export function novaSessaoFicha({ comandaId = null, now = Date.now() } = {}) {
  return { jogo: 'ficha', fichas: 0, usadas: 0, estornadas: 0, valor: 0, inicio: now, fim: null, partidaEm: null, fichaEm: null, comandaId, lanc: [], partidas: [], jogadores: 2, minutos: 0, visto: false };
}

// todas as sessões de sinuca (encerradas + em andamento) de uma mesa, ou de todas
export function sessoesSinuca(s, mesaId = null) {
  const hist = (s.historicoSinuca || []).filter((h) => !mesaId || h.mesaId === mesaId);
  const ativas = s.mesas.filter((m) => ehFicha(m.sessao) && (!mesaId || m.id === mesaId)).map((m) => ({ ...m.sessao, mesaId: m.id, mesaNome: m.nome, ativa: true }));
  return [...hist, ...ativas];
}

export const ultimaConferencia = (s, mesaId) => (s.conferenciasFichas || []).filter((c) => c.mesaId === mesaId).sort((a, b) => b.ts - a.ts)[0] || null;

// partidas (fichas que entraram no cofre) desde um momento
export function usadasDesde(s, mesaId, desde = 0) {
  return sessoesSinuca(s, mesaId).reduce((a, se) => a + (se.partidas || []).filter((ts) => ts > desde).length, 0);
}

// duração de cada partida: vai do início dela até o início da próxima (ou o fim da sessão / agora)
function duracoes(se, now) {
  const p = se.partidas || [];
  return p.map((ts, k) => (p[k + 1] || se.fim || now) - ts).filter((d) => d > 0);
}

// resumo por mesa de sinuca num período (padrão: hoje)
export function resumoSinuca(s, desde, ate = Date.now()) {
  const linhas = mesasSinuca(s).map((m) => {
    const ses = sessoesSinuca(s, m.id).filter((se) => (se.fim || ate) >= desde && se.inicio <= ate);
    const lanc = ses.flatMap((se) => (se.lanc || []).filter((l) => l.ts >= desde && l.ts <= ate));
    const vendidas = lanc.filter((l) => l.qtd > 0).reduce((a, l) => a + l.qtd, 0);
    const estornadas = lanc.filter((l) => l.qtd < 0).reduce((a, l) => a - l.qtd, 0);
    const receita = Math.round(lanc.reduce((a, l) => a + l.valor, 0) * 100) / 100;
    const naComanda = lanc.filter((l) => l.cobranca === 'comanda').reduce((a, l) => a + l.valor, 0);
    const partidas = ses.reduce((a, se) => a + (se.partidas || []).filter((ts) => ts >= desde && ts <= ate).length, 0);
    const durs = ses.flatMap((se) => duracoes(se, ate));
    const ocupadoMin = Math.round(ses.reduce((a, se) => a + (Math.min(se.fim || ate, ate) - Math.max(se.inicio, desde)), 0) / 60000);
    const conf = ultimaConferencia(s, m.id);
    return {
      mesa: m, sessoes: ses.length, vendidas, estornadas, liquidas: vendidas - estornadas, receita, naComanda, avulso: receita - naComanda, partidas,
      mediaPartidaMin: durs.length ? Math.round(durs.reduce((a, d) => a + d, 0) / durs.length / 60000) : 0, ocupadoMin,
      saldoAgora: saldoFichas(m.sessao), conf, desdeConf: usadasDesde(s, m.id, conf ? conf.ts : 0),
    };
  });
  const porPessoa = {};
  sessoesSinuca(s).forEach((se) => (se.lanc || []).forEach((l) => {
    if (l.ts < desde || l.ts > ate) return;
    const p = (porPessoa[l.por || 'Sistema'] = porPessoa[l.por || 'Sistema'] || { vendidas: 0, estornadas: 0, valor: 0 });
    if (l.qtd > 0) p.vendidas += l.qtd; else p.estornadas -= l.qtd;
    p.valor += l.valor;
  }));
  const tot = (k) => linhas.reduce((a, l) => a + l[k], 0);
  return { linhas, porPessoa, total: { vendidas: tot('vendidas'), estornadas: tot('estornadas'), liquidas: tot('liquidas'), receita: Math.round(tot('receita') * 100) / 100, partidas: tot('partidas') } };
}
