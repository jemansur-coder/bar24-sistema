// =====================================================================================
// PONTO ÚNICO DE INTEGRAÇÃO COM A MAQUININHA (POS Smart Android) E O PIX
// =====================================================================================
// O garçom vai usar a própria maquininha de pagamento (POS Smart Android) para fazer os
// pedidos e cobrar. A empresa/modelo da maquininha AINDA NÃO FOI DEFINIDA, então todo o
// sistema chama só as funções deste arquivo. Hoje elas SIMULAM a aprovação.
//
// Quando a adquirente for escolhida, troque apenas a implementação abaixo. Caminhos comuns:
//  - App rodando DENTRO da POS (WebView/PWA): a adquirente expõe um SDK Android
//    (ex.: Stone/Ton, PagBank/PagSeguro "PlugPag", Cielo LIO "Order Manager", GetNet "POS Digital",
//    Mercado Pago Point). Um app Android "casca" (WebView) chama o SDK e devolve o resultado para
//    a página via JavaScript bridge (window.Android.cobrar(...)) ou deep link/intent de retorno.
//  - Maquininha integrada pela nuvem (ex.: Mercado Pago Point, Stone Connect): o servidor do bar
//    cria a "ordem de pagamento" pela API e a POS recebe; o resultado volta por webhook.
//  - Pix: o servidor gera a cobrança dinâmica (API Pix do banco/PSP) e recebe a confirmação por webhook.
//
// Contrato (mantenha igual para não precisar mexer nas telas):
//   cobrar({ valor, metodo: 'cartao'|'pix', descricao, referencia }) -> Promise<Resultado>
//   Resultado = { aprovado: boolean, metodo, valor, nsu?, autorizacao?, bandeira?, mensagem? }
// =====================================================================================

// a página está rodando dentro do app da maquininha (pasta android/ do repositório)?
export const naPOS = () => typeof window !== 'undefined' && !!window.Android && typeof window.Android.cobrar === 'function';

// Informações do app da maquininha: { adquirente: 'cielo', modoTeste: true|false, versao }
export function infoPOS() {
  try { return naPOS() && window.Android.info ? JSON.parse(window.Android.info()) : null; } catch (e) { return null; }
}

// Adquirente escolhida: Cielo (Cielo Smart L300). Fora da maquininha (navegador, tablet) a cobrança é simulada.
export const ADQUIRENTE = naPOS() ? (infoPOS()?.adquirente || 'cielo') : 'simulado';
// a maquininha está em "modo teste" (Configurar maquininha → sem credenciais ou caixa marcada)?
export const cobrancaDeTeste = () => !naPOS() || !!infoPOS()?.modoTeste;

let seq = 0;
function simular({ valor, metodo }) {
  return new Promise((ok) => setTimeout(() => {
    seq += 1;
    ok({ aprovado: true, metodo, valor, nsu: String(100000 + Math.floor(Math.random() * 899999)), autorizacao: 'SIM' + String(seq).padStart(4, '0'), bandeira: metodo === 'pix' ? 'PIX' : 'SIMULADO', mensagem: 'Aprovado (simulação)' });
  }, 1200));
}

// Bridge para o app Android casca: window.Android.cobrar(json) deve chamar de volta
// window.__retornoPOS(id, jsonResultado) quando a maquininha terminar.
function viaBridge(pedido) {
  return new Promise((ok) => {
    const id = 'pos-' + Date.now();
    window.__retornosPOS = window.__retornosPOS || {};
    window.__retornosPOS[id] = ok;
    window.__retornoPOS = window.__retornoPOS || ((rid, json) => { const f = window.__retornosPOS[rid]; delete window.__retornosPOS[rid]; f?.(typeof json === 'string' ? JSON.parse(json) : json); });
    window.Android.cobrar(JSON.stringify({ id, ...pedido }));
  });
}

export async function cobrar({ valor, metodo = 'cartao', descricao = '', referencia = '' }) {
  if (!(valor > 0)) return { aprovado: false, metodo, valor, mensagem: 'Valor inválido' };
  const pedido = { valor: Math.round(valor * 100) / 100, metodo, descricao, referencia };
  if (naPOS()) return viaBridge(pedido);
  return simular(pedido);
}

// Imprime texto na impressora da maquininha (Cielo: lio://print). Fora dela, abre a impressão do navegador.
export function imprimir(texto) {
  if (naPOS() && window.Android.imprimir) { window.Android.imprimir(texto); return true; }
  return false;
}

// Abre a tela de configurações do app da maquininha (Client ID, Access Token, modo teste).
export function configurarPOS() {
  if (naPOS() && window.Android.configurar) window.Android.configurar();
}
