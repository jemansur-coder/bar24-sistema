import { hoje, sugestaoCompra, dias } from './store.jsx';

export function resumoDia(s, now = Date.now()) {
  const ini = hoje(now);
  const pags = s.pagamentos.filter((p) => p.ts >= ini);
  const vendas = pags.filter((p) => p.tipo !== 'recebimento');
  const porMetodo = { pix: 0, cartao: 0, dinheiro: 0, fiado: 0 };
  vendas.forEach((p) => { porMetodo[p.metodo] = (porMetodo[p.metodo] || 0) + p.valor; });
  const total = vendas.reduce((a, p) => a + p.valor, 0);
  const jogos = vendas.filter((p) => p.tipo === 'jogo').reduce((a, p) => a + p.valor, 0);
  const recebFiado = pags.filter((p) => p.tipo === 'recebimento').reduce((a, p) => a + p.valor, 0);
  const porHora = Array.from({ length: 24 }, () => 0);
  vendas.forEach((p) => { porHora[new Date(p.ts).getHours()] += p.valor; });
  const devedores = s.clientes.filter((c) => c.fiado > 0).sort((a, b) => b.fiado - a.fiado);
  const fiadoTotal = devedores.reduce((a, c) => a + c.fiado, 0);
  const fiadoAtrasado = devedores.filter((c) => c.desde && dias(c.desde, now) > 30);
  const sug = sugestaoCompra(s).filter((x) => x.precisa);
  const abaixo = s.insumos.filter((i) => i.estoque <= i.minimo);
  const vencendo = s.insumos.filter((i) => i.validade && i.validade - now < 7 * 86400000);
  // mais vendidos: itens das comandas de hoje
  const top = {};
  s.comandas.forEach((c) => c.itens.forEach((i) => { if (i.produtoId && i.enviadoEm && i.enviadoEm >= ini) top[i.nome] = (top[i.nome] || 0) + i.qtd; }));
  const maisVendidos = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const fechadas = s.comandas.filter((c) => c.status === 'fechada' && c.fechadaEm >= ini).length;
  const nVendas = vendas.filter((p) => p.tipo === 'venda').length;
  const cancel = s.log.filter((l) => l.ts >= ini && l.msg.startsWith('Cancelado'));
  return { total, porMetodo, jogos, recebFiado, porHora, devedores, fiadoTotal, fiadoAtrasado, sug, abaixo, vencendo, maisVendidos, fechadas, nVendas, ticket: nVendas ? (total - jogos) / nVendas : 0, cancel };
}
