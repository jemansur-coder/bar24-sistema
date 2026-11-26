// Dados de exemplo para o protótipo. Em produção virão do banco de dados.
const MIN = 60 * 1000;
const DIA = 24 * 60 * MIN;

export const CATEGORIAS = ['Lanches', 'Porções', 'Pratos', 'Cervejas', 'Doses', 'Sem álcool'];

export const DESCRICOES = {
  'x-tudo': 'Pão, hambúrguer, queijo, bacon, ovo, alface e tomate',
  'x-bacon': 'Pão, hambúrguer, queijo e bacon crocante',
  'x-duplo': 'Pão, dois hambúrgueres e queijo',
  'x-egg': 'Pão, hambúrguer, queijo e ovo',
  'x-frango': 'Pão, filé de frango e queijo',
  'x-salada': 'Pão, hambúrguer, queijo, alface e tomate',
  'x-picanha': 'Pão, picanha fatiada e queijo',
  'fritas': 'Porção de batata frita sequinha',
  'coxinha': 'Coxinha de frango, frita na hora',
  'prato-dia': 'Arroz, feijão, carne e salada',
};

export const TIPOS_JOGO = [
  { id: 'ficha', nome: 'Ficha sinuca', preco: 2, mesa: 'sinuca', porFicha: true },
  { id: 'ronda', nome: 'Ronda', preco: 50, mesa: 'cartas' },
  { id: 'pife', nome: 'Pife', preco: 25, mesa: 'cartas' },
];

export const MESAS_SALAO = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: 'm' + n, nome: 'Mesa ' + n })).concat([{ id: 'balcao', nome: 'Balcão' }]);

// ordem da tela de PIN: Dono, Gerente, Garçom, Cozinha (depois os demais papéis)
export const PAPEIS = ['Dono', 'Gerente', 'Garçom', 'Cozinha', 'Caixa', 'Estoquista'];

// ---------- controle de estoque ----------
export const MOTIVOS_SAIDA = [['perda', 'Perda / estragou'], ['quebra', 'Quebra'], ['vencido', 'Venceu'], ['consumo', 'Consumo da equipe'], ['cortesia', 'Cortesia']];
export const GRUPOS_ESTOQUE = ['Cervejas e refri', 'Destilados', 'Cozinha'];
const GRUPO_POR_FORN = { 'f-dist': 'Cervejas e refri', 'f-emporio': 'Destilados' };
// itens caros, contados no fim de cada turno
const CONTROLE = ['i-heineken', 'i-original', 'i-brahma', 'i-redbull', 'i-cachaca', 'i-whisky', 'i-vodka', 'i-picanha'];

// completa os insumos com código, grupo e se entram na contagem do turno
export function completarInsumos(insumos) {
  insumos.forEach((i, k) => {
    if (i.codigo == null) i.codigo = 101 + k;
    if (!i.grupo) i.grupo = GRUPO_POR_FORN[i.fornecedorId] || 'Cozinha';
    if (i.controle == null) i.controle = CONTROLE.includes(i.id);
    if (i.grupo === 'Destilados' && !i.garrafaMl) { i.garrafaMl = 1000; i.doseMl = 50; }
  });
  return insumos;
}

// histórico de exemplo: vendas, entrada, perdas e uma contagem de turno com diferença
export function historicoEstoque(insumos, now = Date.now()) {
  const movs = []; const H = 60 * MIN;
  const mv = (insumoId, tipo, qtd, ts, por, extra = {}) => movs.push({ id: 'mv-s' + movs.length, ts, insumoId, tipo, qtd, por, ...extra });
  const vendas = [['i-heineken', 1], ['i-brahma', 1], ['i-original', 1], ['i-coca', 1], ['i-cachaca', 50], ['i-whisky', 50], ['i-hamb', 1], ['i-pao', 1], ['i-batata', 400]];
  for (let h = 30; h > 0; h--) vendas.forEach(([id, q], k) => { if ((h + k) % 3 === 0) mv(id, 'venda', -q * (1 + (h % 3)), now - h * H - k * MIN, h % 2 ? 'Rafael' : 'Bia', { ref: 'Comanda ' + (850 + h) }); });
  mv('i-heineken', 'entrada', 96, now - 26 * H, 'Ingrid', { ref: 'PC-0000 · NF 4471', obs: 'Conferido com o pedido' });
  mv('i-brahma', 'entrada', 48, now - 26 * H, 'Ingrid', { ref: 'PC-0000 · NF 4471' });
  mv('i-heineken', 'quebra', -2, now - 20 * H, 'Joana', { autorizou: 'Ingrid', obs: 'Caiu da caixa na reposição' });
  mv('i-original', 'consumo', -1, now - 9 * H, 'Zé', { autorizou: 'Mansur', obs: 'Uso na receita' });
  mv('i-whisky', 'cortesia', -100, now - 7 * H, 'Mansur', { autorizou: 'Mansur', obs: '2 doses de cortesia aniversariante' });
  mv('i-heineken', 'contagem', -4, now - 4 * H - 3 * MIN, 'Mansur', { obs: 'Contagem do turno: faltaram 4' });
  mv('i-whisky', 'contagem', -150, now - 4 * H - 3 * MIN, 'Mansur', { obs: 'Contagem do turno: faltaram 3 doses' });
  movs.sort((a, b) => a.ts - b.ts);
  const custo = (id) => insumos.find((i) => i.id === id)?.custo || 0;
  const contagens = [{ id: 'ct-1', ts: now - 4 * H - 3 * MIN, por: 'Mansur', turno: 'Mansur', itens: [
    { insumoId: 'i-heineken', esperado: 22, contado: 18, dif: -4, valor: -4 * custo('i-heineken') },
    { insumoId: 'i-whisky', esperado: 2150, contado: 2000, dif: -150, valor: -150 * custo('i-whisky') },
    { insumoId: 'i-brahma', esperado: 120, contado: 120, dif: 0, valor: 0 },
    { insumoId: 'i-original', esperado: 96, contado: 96, dif: 0, valor: 0 },
  ] }];
  contagens[0].valor = contagens[0].itens.reduce((a, x) => a + x.valor, 0);
  const alertas = [{ id: 'al-s1', ts: now - 4 * H - 3 * MIN, tipo: 'divergencia', texto: 'Contagem do turno de Mansur: faltaram 4 Heineken long neck e 3 doses de Whisky Red Label', valor: contagens[0].valor, por: 'Mansur', visto: false }];
  return { movs, contagens, alertas };
}

export function seed() {
  const now = Date.now();
  const insumos = [
    { id: 'i-pao', nome: 'Pão de hambúrguer', un: 'un', estoque: 64, minimo: 40, custo: 0.9, consumoDia: 35, fornecedorId: 'f-padaria', validade: now + 5 * DIA },
    { id: 'i-hamb', nome: 'Hambúrguer 120 g', un: 'un', estoque: 22, minimo: 40, custo: 3.8, consumoDia: 30, fornecedorId: 'f-carne' },
    { id: 'i-picanha', nome: 'Picanha (porção 150 g)', un: 'un', estoque: 14, minimo: 10, custo: 11, consumoDia: 5, fornecedorId: 'f-carne' },
    { id: 'i-frango', nome: 'Filé de frango 120 g', un: 'un', estoque: 30, minimo: 15, custo: 2.6, consumoDia: 6, fornecedorId: 'f-carne' },
    { id: 'i-queijo', nome: 'Queijo mussarela (fatia)', un: 'fatia', estoque: 180, minimo: 100, custo: 0.45, consumoDia: 60, fornecedorId: 'f-padaria', validade: now + 4 * DIA },
    { id: 'i-bacon', nome: 'Bacon', un: 'g', estoque: 2400, minimo: 1500, custo: 0.06, consumoDia: 700, fornecedorId: 'f-carne' },
    { id: 'i-ovo', nome: 'Ovo', un: 'un', estoque: 90, minimo: 60, custo: 0.7, consumoDia: 25, fornecedorId: 'f-padaria' },
    { id: 'i-batata', nome: 'Batata congelada', un: 'g', estoque: 6000, minimo: 8000, custo: 0.013, consumoDia: 4000, fornecedorId: 'f-carne' },
    { id: 'i-coxinha', nome: 'Coxinha congelada', un: 'un', estoque: 70, minimo: 50, custo: 1.2, consumoDia: 30, fornecedorId: 'f-padaria', validade: now + 2 * DIA },
    { id: 'i-prato', nome: 'Prato do dia (kit)', un: 'un', estoque: 40, minimo: 20, custo: 12, consumoDia: 30, fornecedorId: 'f-carne' },
    { id: 'i-heineken', nome: 'Heineken long neck', un: 'un', estoque: 18, minimo: 72, custo: 5.8, consumoDia: 70, fornecedorId: 'f-dist' },
    { id: 'i-original', nome: 'Original 600 ml', un: 'un', estoque: 96, minimo: 48, custo: 7.2, consumoDia: 30, fornecedorId: 'f-dist' },
    { id: 'i-brahma', nome: 'Brahma 600 ml', un: 'un', estoque: 120, minimo: 48, custo: 6.1, consumoDia: 28, fornecedorId: 'f-dist' },
    { id: 'i-coca', nome: 'Coca-Cola lata', un: 'un', estoque: 30, minimo: 48, custo: 3.1, consumoDia: 26, fornecedorId: 'f-dist' },
    { id: 'i-guarana', nome: 'Guaraná lata', un: 'un', estoque: 60, minimo: 36, custo: 2.8, consumoDia: 12, fornecedorId: 'f-dist' },
    { id: 'i-agua', nome: 'Água mineral 500 ml', un: 'un', estoque: 80, minimo: 36, custo: 1.1, consumoDia: 15, fornecedorId: 'f-dist' },
    { id: 'i-redbull', nome: 'Red Bull', un: 'un', estoque: 24, minimo: 12, custo: 7.5, consumoDia: 4, fornecedorId: 'f-dist' },
    { id: 'i-cachaca', nome: 'Cachaça (garrafa 1 L)', un: 'ml', estoque: 5200, minimo: 2000, custo: 0.03, consumoDia: 1800, fornecedorId: 'f-emporio' },
    { id: 'i-whisky', nome: 'Whisky Red Label (1 L)', un: 'ml', estoque: 2000, minimo: 3000, custo: 0.119, consumoDia: 450, fornecedorId: 'f-emporio' },
    { id: 'i-vodka', nome: 'Vodka (1 L)', un: 'ml', estoque: 3500, minimo: 2000, custo: 0.045, consumoDia: 400, fornecedorId: 'f-emporio' },
  ];

  const p = (id, nome, cat, preco, destino, ficha = []) => ({ id, nome, cat, preco, destino, ficha, ativo: true, descricao: DESCRICOES[id] || '' });
  const produtos = [
    p('x-tudo', 'X Tudo', 'Lanches', 25, 'cozinha', [['i-pao', 1], ['i-hamb', 1], ['i-queijo', 2], ['i-bacon', 30], ['i-ovo', 1]]),
    p('x-bacon', 'X Bacon', 'Lanches', 20, 'cozinha', [['i-pao', 1], ['i-hamb', 1], ['i-queijo', 1], ['i-bacon', 40]]),
    p('x-duplo', 'X Duplo', 'Lanches', 17, 'cozinha', [['i-pao', 1], ['i-hamb', 2], ['i-queijo', 1]]),
    p('x-egg', 'X Egg', 'Lanches', 18, 'cozinha', [['i-pao', 1], ['i-hamb', 1], ['i-queijo', 1], ['i-ovo', 1]]),
    p('x-frango', 'X Frango', 'Lanches', 20, 'cozinha', [['i-pao', 1], ['i-frango', 1], ['i-queijo', 1]]),
    p('x-salada', 'X Salada', 'Lanches', 17, 'cozinha', [['i-pao', 1], ['i-hamb', 1], ['i-queijo', 1]]),
    p('x-picanha', 'X Picanha', 'Lanches', 30, 'cozinha', [['i-pao', 1], ['i-picanha', 1], ['i-queijo', 1]]),
    p('fritas', 'Porção de fritas', 'Porções', 28, 'cozinha', [['i-batata', 400]]),
    p('coxinha', 'Coxinha (un.)', 'Porções', 6, 'cozinha', [['i-coxinha', 1]]),
    p('prato-dia', 'Prato do dia', 'Pratos', 35, 'cozinha', [['i-prato', 1]]),
    p('heineken', 'Heineken long neck', 'Cervejas', 12, 'bar', [['i-heineken', 1]]),
    p('original', 'Original 600 ml', 'Cervejas', 15, 'bar', [['i-original', 1]]),
    p('brahma', 'Brahma 600 ml', 'Cervejas', 13, 'bar', [['i-brahma', 1]]),
    p('dose-cachaca', 'Dose de cachaça', 'Doses', 6, 'bar', [['i-cachaca', 50]]),
    p('dose-whisky', 'Dose de whisky', 'Doses', 18, 'bar', [['i-whisky', 50]]),
    p('dose-vodka', 'Dose de vodka', 'Doses', 10, 'bar', [['i-vodka', 50]]),
    p('coca', 'Coca-Cola lata', 'Sem álcool', 6, 'bar', [['i-coca', 1]]),
    p('guarana', 'Guaraná lata', 'Sem álcool', 6, 'bar', [['i-guarana', 1]]),
    p('agua', 'Água mineral', 'Sem álcool', 4, 'bar', [['i-agua', 1]]),
    p('redbull', 'Red Bull', 'Sem álcool', 14, 'bar', [['i-redbull', 1]]),
  ];

  const fornecedores = [
    { id: 'f-dist', nome: 'Distribuidora Central', cnpj: '12.345.678/0001-90', contato: '(11) 4000-1000', prazoDias: 1 },
    { id: 'f-carne', nome: 'Frigorífico Boa Carne', cnpj: '23.456.789/0001-01', contato: '(11) 4000-2000', prazoDias: 2 },
    { id: 'f-padaria', nome: 'Padaria Pão Nosso', cnpj: '34.567.890/0001-12', contato: '(11) 4000-3000', prazoDias: 1 },
    { id: 'f-emporio', nome: 'Empório de Bebidas', cnpj: '45.678.901/0001-23', contato: '(11) 4000-4000', prazoDias: 3 },
  ];

  const clientes = [
    { id: 'c-goiote', nome: 'Caio', apelido: 'Goiote', tel: '', limite: 400, fiado: 412, desde: now - 42 * DIA },
    { id: 'c-mec', nome: 'Marcos', apelido: 'Mec', tel: '', limite: 500, fiado: 356.5, desde: now - 31 * DIA },
    { id: 'c-jp', nome: 'João Pedro', apelido: 'JP', tel: '', limite: 400, fiado: 280, desde: now - 12 * DIA },
    { id: 'c-finim', nome: 'Finim', apelido: '', tel: '', limite: 300, fiado: 195, desde: now - 6 * DIA },
    { id: 'c-ana', nome: 'Ana Souza', apelido: '', tel: '', limite: 300, fiado: 0, desde: null },
  ];

  const usuarios = [
    { id: 'u-mansur', nome: 'Mansur', papel: 'Dono', pin: '1234', ativo: true },
    { id: 'u-gilmar', nome: 'Gilmar', papel: 'Dono', pin: '5555', ativo: true },
    { id: 'u-ingrid', nome: 'Ingrid', papel: 'Gerente', pin: '6666', ativo: true },
    { id: 'u-joana', nome: 'Joana', papel: 'Caixa', pin: '1111', ativo: true },
    { id: 'u-rafael', nome: 'Rafael', papel: 'Garçom', pin: '2222', ativo: true },
    { id: 'u-bia', nome: 'Bia', papel: 'Garçom', pin: '3333', ativo: true },
    { id: 'u-ze', nome: 'Zé', papel: 'Cozinha', pin: '4444', ativo: true },
  ];

  let grupo = '';
  const g = (n) => { grupo = n; return n; };
  const it = (prod, qtd, status, enviadoMin, obs = '') => {
    const pr = produtos.find((x) => x.id === prod);
    return { id: 'it-' + Math.random().toString(36).slice(2, 9), produtoId: prod, nome: pr.nome, preco: pr.preco, qtd, obs, destino: pr.destino, status,
      envio: enviadoMin == null ? null : 'e-' + grupo + '-' + enviadoMin, enviadoEm: enviadoMin == null ? null : now - enviadoMin * MIN };
  };

  const comandas = [
    { id: 'cm-940', numero: g('940'), mesaId: 'm1', clienteId: 'c-goiote', garcom: 'Rafael', abertaEm: now - 182 * MIN, pessoas: 4, servico: true, status: 'aberta', contaPedida: false,
      itens: [it('prato-dia', 4, 'entregue', 150, 'completo'), it('heineken', 6, 'entregue', 120), it('x-tudo', 2, 'preparo', 9, '1 sem cebola'),
        { id: 'it-ficha-s1', produtoId: null, nome: 'Ficha sinuca · Sinuca 1', preco: 2, qtd: 5, obs: '', destino: 'jogo', status: 'entregue', envio: null, enviadoEm: now - 7 * MIN, fichaMesaId: 'sinuca-1', por: 'Joana' }] },
    { id: 'cm-959', numero: g('959'), mesaId: 'm5', clienteId: null, garcom: 'Rafael', abertaEm: now - 72 * MIN, pessoas: 3, servico: true, status: 'aberta', contaPedida: true,
      itens: [it('brahma', 4, 'entregue', 60), it('x-picanha', 2, 'preparo', 22, '1 sem cebola')] },
    { id: 'cm-962', numero: g('962'), mesaId: 'm2', clienteId: null, garcom: 'Bia', abertaEm: now - 40 * MIN, pessoas: 2, servico: true, status: 'aberta', contaPedida: false,
      itens: [it('fritas', 1, 'enviado', 4, 'com cheddar'), it('coxinha', 6, 'enviado', 4), it('original', 2, 'entregue', 30), it('heineken', 2, 'enviado', 1)] },
    { id: 'cm-964', numero: g('964'), clienteId: null, garcom: 'Bia', abertaEm: now - 15 * MIN, pessoas: 1, servico: false, status: 'aberta', contaPedida: false,
      itens: [it('agua', 1, 'pendente', null)] },
  ];

  const mesas = [
    // Sinuca 1: 5 fichas compradas na comanda 940, jogando a 3ª (saldo 2). Sinuca 2: 1 ficha paga em dinheiro, última ficha.
    { id: 'sinuca-1', nome: 'Sinuca 1', tipo: 'sinuca', sessao: { jogo: 'ficha', fichas: 5, usadas: 3, estornadas: 0, jogadores: 2, minutos: 0, inicio: now - 34 * MIN, partidaEm: now - 6 * MIN, fichaEm: now - 6 * MIN, fim: null, valor: 10, comandaId: 'cm-940', visto: false,
      partidas: [now - 34 * MIN, now - 21 * MIN, now - 6 * MIN],
      lanc: [{ id: 'lf-s1a', ts: now - 34 * MIN, qtd: 3, valor: 6, cobranca: 'comanda', comandaNum: '940', por: 'Joana' }, { id: 'lf-s1b', ts: now - 7 * MIN, qtd: 2, valor: 4, cobranca: 'comanda', comandaNum: '940', por: 'Rafael' }] } },
    { id: 'sinuca-2', nome: 'Sinuca 2', tipo: 'sinuca', sessao: { jogo: 'ficha', fichas: 1, usadas: 1, estornadas: 0, jogadores: 2, minutos: 0, inicio: now - 9 * MIN, partidaEm: now - 9 * MIN, fichaEm: now - 9 * MIN, fim: null, valor: 2, comandaId: null, visto: false,
      partidas: [now - 9 * MIN], lanc: [{ id: 'lf-s2a', ts: now - 9 * MIN, qtd: 1, valor: 2, cobranca: 'dinheiro', comandaNum: null, por: 'Joana' }] } },
    { id: 'sinuca-3', nome: 'Sinuca 3', tipo: 'sinuca', sessao: null },
    { id: 'cartas-1', nome: 'Cartas 1', tipo: 'cartas', sessao: { jogo: 'pife', jogadores: 4, minutos: 60, inicio: now - 57 * MIN, fim: now + 3 * MIN, valor: 100, comandaId: null, visto: false } },
    { id: 'cartas-2', nome: 'Cartas 2', tipo: 'cartas', sessao: { jogo: 'ronda', jogadores: 3, minutos: 60, inicio: now - 19 * MIN, fim: now + 41 * MIN, valor: 150, comandaId: null, visto: false } },
    { id: 'cartas-3', nome: 'Cartas 3', tipo: 'cartas', sessao: null },
  ];

  // Pagamentos do dia (exemplo) para o dashboard não começar vazio.
  const pagamentos = [];
  const hojeIni = new Date(now).setHours(0, 0, 0, 0);
  const metodos = ['pix', 'pix', 'cartao', 'dinheiro', 'pix', 'cartao', 'fiado', 'dinheiro', 'pix', 'cartao'];
  for (let i = 0; i < 46; i++) {
    const m = metodos[i % metodos.length];
    pagamentos.push({ id: 'pg-s' + i, ts: Math.max(now - (8 * 60 - i * 10) * MIN, hojeIni + i * MIN), metodo: m, valor: Math.round((40 + ((i * 37) % 140)) * 100) / 100, origem: 'Comanda ' + (880 + i), clienteId: m === 'fiado' ? 'c-jp' : null, tipo: 'venda' });
  }
  pagamentos.push({ id: 'pg-j1', ts: now - 120 * MIN, metodo: 'pix', valor: 100, origem: 'Jogo Pife · Cartas 1', tipo: 'jogo' });
  pagamentos.push({ id: 'pg-j2', ts: now - 19 * MIN, metodo: 'dinheiro', valor: 150, origem: 'Jogo Ronda · Cartas 2', tipo: 'jogo' });
  pagamentos.push({ id: 'pg-j3', ts: now - 9 * MIN, metodo: 'dinheiro', valor: 2, origem: 'Ficha sinuca · Sinuca 2', tipo: 'jogo', mesaJogoId: 'sinuca-2', fichas: 1, por: 'Joana' });
  // sessões de sinuca já encerradas hoje (histórico por mesa)
  const sessaoAntiga = (id, mesaId, mesaNome, iniMin, partidasMin, fimMin, cobranca, por) => {
    const n = partidasMin.length; const ts = now - iniMin * MIN;
    if (cobranca !== 'comanda') pagamentos.push({ id: 'pg-' + id, ts, metodo: cobranca, valor: n * 2, origem: 'Ficha sinuca · ' + mesaNome, tipo: 'jogo', mesaJogoId: mesaId, fichas: n, por });
    return { id, mesaId, mesaNome, jogo: 'ficha', inicio: ts, fim: now - fimMin * MIN, fichas: n, usadas: n, estornadas: 0, valor: n * 2, comandaId: null, comandaNum: null, sobraCobrada: 0, encerradoPor: por,
      partidas: partidasMin.map((m) => now - m * MIN), lanc: [{ id: 'lf-' + id, ts, qtd: n, valor: n * 2, cobranca, comandaNum: null, por }] };
  };
  const historicoSinuca = [
    sessaoAntiga('hs-1', 'sinuca-3', 'Sinuca 3', 200, [200, 186, 171, 158], 140, 'pix', 'Joana'),
    sessaoAntiga('hs-2', 'sinuca-1', 'Sinuca 1', 150, [150, 137, 122], 105, 'dinheiro', 'Joana'),
    sessaoAntiga('hs-3', 'sinuca-3', 'Sinuca 3', 95, [95, 80], 60, 'cartao', 'Rafael'),
  ];

  // turno anterior já fechado (com R$ 5 faltando, para mostrar a diferença)
  const tA = now - 16 * 60 * MIN, tF = now - 4 * 60 * MIN - 2 * MIN;
  const dinA = pagamentos.filter((p) => p.ts >= tA && p.ts <= tF && p.metodo === 'dinheiro').reduce((a, p) => a + p.valor, 0);
  const espA = 200 + dinA;
  const turnoAnterior = { id: 'tu-1', aberto: false, abertoEm: tA, fechadoEm: tF, operador: 'Mansur', fechadoPor: 'Mansur', fundo: 200, movs: [], contado: espA - 5, notas: {}, obs: 'Faltou R$ 5, provável troco errado', esperado: espA, diferenca: -5 };

  return {
    versao: 1,
    seq: 971,
    produtos, insumos: completarInsumos(insumos), fornecedores, clientes, usuarios, comandas, mesas, pagamentos,
    pedidosCompra: [],
    ...(() => { const h = historicoEstoque(insumos, now); return { movsEstoque: h.movs, contagens: h.contagens, alertasEstoque: h.alertas }; })(),
    mesasSalao: MESAS_SALAO.map((m) => ({ ...m })),
    fila: [{ id: 'fl-1', nome: 'Pedro', tel: '', tipo: 'sinuca', jogadores: 2, ts: now - 6 * MIN, status: 'aguardando', mesaJogoId: null }],
    chamados: [],
    avisosCozinha: [],
    notas: [],
    log: [],
    caixa: { aberto: true, abertoEm: now - 4 * 60 * MIN, operador: 'Joana', fundo: 200, movs: [{ tipo: 'sangria', valor: 300, motivo: 'Depósito no cofre', ts: now - 90 * MIN, por: 'Joana' }] },
    turnos: [turnoAnterior],
    historicoSinuca,
    // última conferência do cofre de cada mesa (madrugada); a partir daqui o sistema conta as partidas
    conferenciasFichas: ['sinuca-1', 'sinuca-2', 'sinuca-3'].map((id, k) => ({ id: 'cf-' + id, ts: now - 240 * MIN, mesaId: id, mesaNome: 'Sinuca ' + (k + 1), desde: null, esperado: 0, contado: 0, dif: 0, valor: 0, por: 'Ingrid', obs: 'Cofre esvaziado na troca de turno' })),
    config: { servico: 10, avisoMin: 5, nomeBar: 'Bar 24 Horas', limiteDivergencia: 20, precoFicha: 2 },
  };
}
