import { brl, hora, useStore } from '../store.jsx';
import { resumoDia } from '../stats.js';
import { Logo } from '../ui.jsx';
import { rankingDivergencias } from './Estoque.jsx';

export default function Relatorio() {
  const { s } = useStore();
  const now = Date.now();
  const r = resumoDia(s, now);
  const data = new Date(now).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const jogosPorTipo = {};
  s.pagamentos.filter((p) => p.tipo === 'jogo' && p.ts >= new Date(now).setHours(0, 0, 0, 0)).forEach((p) => { const k = p.origem.split('·')[0].replace('Jogo ', '').trim(); jogosPorTipo[k] = (jogosPorTipo[k] || 0) + p.valor; });
  const ini = new Date(now).setHours(0, 0, 0, 0);
  const turnos = s.turnos.filter((t) => t.fechadoEm >= ini);
  const esg = s.produtos.filter((p) => p.ativo && p.esgotado);
  const div = rankingDivergencias(s, ini);
  const faltaContagem = s.contagens.filter((c) => c.ts >= ini).reduce((a, c) => a + c.itens.filter((x) => x.dif < 0).reduce((b, x) => b - x.valor, 0), 0);
  const saidas = s.movsEstoque.filter((m) => m.ts >= ini && ['perda', 'quebra', 'vencido', 'consumo', 'cortesia'].includes(m.tipo));
  const valorSaidas = saidas.reduce((a, m) => a - m.qtd * (s.insumos.find((i) => i.id === m.insumoId)?.custo || 0), 0);
  const cancelDepois = s.alertasEstoque.filter((a) => a.ts >= ini && a.tipo === 'cancelamento');
  const texto = [
    `*${s.config.nomeBar} — relatório de ${data}*`,
    `Vendas: ${brl(r.total)} (${r.nVendas} pagamentos)`,
    `Pix ${brl(r.porMetodo.pix)} · Cartão ${brl(r.porMetodo.cartao)} · Dinheiro ${brl(r.porMetodo.dinheiro)} · Fiado ${brl(r.porMetodo.fiado)}`,
    `Fiado em aberto: ${brl(r.fiadoTotal)} (${r.devedores.length} clientes, ${r.fiadoAtrasado.length} há +30 dias) · recebido hoje ${brl(r.recebFiado)}`,
    `Jogos: ${brl(r.jogos)}`,
    `Estoque: ${r.abaixo.length} itens abaixo do mínimo · compra sugerida ${brl(r.sug.reduce((a, x) => a + x.valor, 0))}`,
    r.cancel.length ? `Cancelamentos: ${r.cancel.length}` : '',
    ...turnos.map((t) => `Turno ${t.operador} ${hora(t.abertoEm)}–${hora(t.fechadoEm)}: ${Math.abs(t.diferenca) < 0.01 ? 'caixa conferiu' : 'diferença ' + brl(t.diferenca)}`),
    `Controle de estoque: faltas na contagem ${brl(faltaContagem)} · saídas sem venda ${brl(valorSaidas)} (${saidas.length}) · cancelados depois de sair ${cancelDepois.length}`,
    div.pessoas.length ? `Maior divergência: ${div.pessoas[0][0]} (${brl(div.pessoas[0][1].valor)})` : '',
    esg.length ? `Esgotado agora: ${esg.map((p) => p.nome).join(', ')}` : '',
  ].filter(Boolean).join('\n');
  const Sec = ({ t, children, bg }) => <section style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', background: bg }} className="col"><h2>{t}</h2>{children}</section>;
  const L = ({ a, b, cls = '' }) => <div className="row between"><span>{a}</span><b className={'num ' + cls}>{b}</b></div>;
  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}><h1>Relatório do dia</h1><span className="muted">Enviado automaticamente ao dono toda noite (WhatsApp e e-mail) na versão final</span></div>
        <div className="row wrap">
          <a className="btn primary" href={'https://wa.me/?text=' + encodeURIComponent(texto)} target="_blank" rel="noreferrer">Enviar no WhatsApp</a>
          <button type="button" className="btn" onClick={() => { try { navigator.clipboard.writeText(texto); } catch (e) { /* ignora */ } }}>Copiar texto</button>
        </div>
      </div>
      <div className="report card" style={{ padding: 0, overflow: 'hidden' }}>
        <header style={{ background: '#111214', color: '#F4F4F5', padding: 24 }} className="col">
          <div className="row"><Logo size={36} /><b className="display">24 HORAS BAR</b></div>
          <span style={{ color: '#A1A1AA' }}>Relatório de {data}</span>
          <span className="display num" style={{ fontSize: 40, fontWeight: 700, color: '#FFC21A' }}>{brl(r.total)}</span>
          <span style={{ color: '#D4D4D8' }}>{r.nVendas} pagamentos · {r.fechadas} comandas fechadas no sistema novo · ticket médio {brl(r.ticket)}</span>
        </header>
        <Sec t="Formas de pagamento"><L a="Pix" b={brl(r.porMetodo.pix)} /><L a="Cartão" b={brl(r.porMetodo.cartao)} /><L a="Dinheiro" b={brl(r.porMetodo.dinheiro)} /><L a="Fiado" b={brl(r.porMetodo.fiado)} /></Sec>
        <Sec t="Fiado" bg="var(--accent-soft)"><L a="Lançado hoje" b={brl(r.porMetodo.fiado)} /><L a="Recebido hoje" b={brl(r.recebFiado)} /><L a="Total em aberto" b={brl(r.fiadoTotal) + ' · ' + r.devedores.length + ' clientes'} /><L a="Há mais de 30 dias" b={r.fiadoAtrasado.length + ' clientes'} cls={r.fiadoAtrasado.length ? 'bad' : ''} /></Sec>
        <Sec t="Estoque">
          <L a="Abaixo do mínimo" b={r.abaixo.length + ' itens'} cls={r.abaixo.length ? 'bad' : ''} />
          {r.abaixo.length > 0 && <span className="small muted">{r.abaixo.map((i) => i.nome).join(', ')}</span>}
          <L a="Vencendo em 7 dias" b={r.vencendo.length + ' lotes'} />
          <L a="Compra sugerida" b={brl(r.sug.reduce((a, x) => a + x.valor, 0))} />
        </Sec>
        <Sec t="Controle de estoque" bg={faltaContagem + valorSaidas > 0 ? 'var(--bad-soft)' : undefined}>
          <L a="Faltas na contagem do turno" b={brl(faltaContagem)} cls={faltaContagem > 0 ? 'bad' : ''} />
          <L a={'Saídas sem venda (' + saidas.length + ')'} b={brl(valorSaidas)} />
          <L a="Cancelados depois de sair do bar/cozinha" b={cancelDepois.length} cls={cancelDepois.length ? 'bad' : ''} />
          {div.pessoas.slice(0, 3).map(([n, v]) => <L key={n} a={'· ' + n} b={brl(v.valor)} />)}
        </Sec>
        <Sec t="Mais vendidos (sistema novo)">{r.maisVendidos.length ? r.maisVendidos.map(([n, q], k) => <L key={n} a={k + 1 + '. ' + n} b={q + ' un.'} />) : <span className="muted">Sem dados ainda</span>}</Sec>
        <Sec t="Jogos">{Object.entries(jogosPorTipo).map(([k, v]) => <L key={k} a={k} b={brl(v)} />)}<L a="Total" b={brl(r.jogos)} /></Sec>
        <Sec t="Turnos de caixa">
          {!turnos.length && <span className="muted">Nenhum turno fechado hoje ainda</span>}
          {turnos.map((t) => <L key={t.id} a={t.operador + ' · ' + hora(t.abertoEm) + ' às ' + hora(t.fechadoEm)} b={Math.abs(t.diferenca) < 0.01 ? 'Conferiu' : (t.diferenca < 0 ? 'Faltou ' : 'Sobrou ') + brl(Math.abs(t.diferenca))} cls={Math.abs(t.diferenca) < 0.01 ? 'ok' : 'bad'} />)}
        </Sec>
        <Sec t="Atenção">
          {r.cancel.map((l, k) => <span key={k} className="small">{hora(l.ts)} · {l.msg}</span>)}
          {esg.length > 0 && <span className="small bad">Esgotado agora: {esg.map((p) => p.nome).join(', ')}</span>}
          <span>{r.cancel.length ? r.cancel.length + ' cancelamento(s) hoje. ' : 'Nenhum cancelamento. '}{s.log.filter((l) => l.msg.startsWith('Caixa fechado')).slice(0, 1).map((l) => l.msg).join('')}</span>
        </Sec>
      </div>
    </>
  );
}
