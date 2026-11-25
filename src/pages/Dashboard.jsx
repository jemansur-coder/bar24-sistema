import { Link } from '../router.jsx';
import { A, avisosAbertos, brl, desde, ticketsBar, dias, estadoMesa, mmss, nomeCliente, tipoJogo, totalComanda, useNow, useStore } from '../store.jsx';
import { resumoDia } from '../stats.js';
import { nomeMotivo, ticketsCozinha } from './Cozinha.jsx';
import { Kpi } from '../ui.jsx';

const CORES = { pix: 'var(--accent)', cartao: 'var(--text)', dinheiro: 'var(--muted)', fiado: 'var(--line-2)' };
const NOMES = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro', fiado: 'Fiado' };

export default function Dashboard() {
  const { s, act } = useStore();
  const now = useNow(1000);
  const r = resumoDia(s, now);
  const abertas = s.comandas.filter((c) => c.status === 'aberta');
  const emAberto = abertas.reduce((a, c) => a + totalComanda(c, s.config).falta, 0);
  const emJogo = s.mesas.filter((m) => m.sessao);
  const acabando = s.mesas.filter((m) => ['acabando', 'esgotado'].includes(estadoMesa(m, now, s.config.avisoMin)));
  const tickets = ticketsCozinha(s);
  const atrasados = tickets.filter((t) => now - t.ts > 15 * 60000);
  const h0 = new Date(now).getHours();
  const horas = Array.from({ length: 12 }, (_, k) => (h0 - 11 + k + 24) % 24);
  const maxH = Math.max(1, ...horas.map((h) => r.porHora[h]));
  const saud = h0 < 5 ? 'Boa madrugada' : h0 < 12 ? 'Bom dia' : h0 < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}>
          <h1>{saud}, Mansur</h1>
          <span className="muted">{new Date(now).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · {s.caixa.aberto ? 'turno de ' + s.caixa.operador : 'caixa fechado'}</span>
        </div>
        <Link className="btn primary" to="relatorio">Ver relatório do dia</Link>
      </div>
      {s.alertasEstoque.some((a) => !a.visto) && (
        <section className="card col" style={{ borderColor: 'var(--bad)' }} aria-label="Alertas de estoque">
          <div className="row between wrap"><h2>Estoque: divergências ({s.alertasEstoque.filter((a) => !a.visto).length})</h2><Link className="btn sm" to="estoque">Ver no estoque</Link></div>
          {s.alertasEstoque.filter((a) => !a.visto).slice(0, 4).map((a) => (
            <div key={a.id} className="list-item">
              <div className="col" style={{ gap: 2 }}><b>{a.texto}</b><span className="small muted">há {desde(a.ts, now)}{a.valor ? ' · ' + brl(Math.abs(a.valor)) : ''}</span></div>
              <button type="button" className="btn sm" onClick={() => act((d) => A.vistoAlertaEstoque(d, a.id))}>Vi</button>
            </div>
          ))}
        </section>
      )}
      {avisosAbertos(s).length > 0 && (
        <section className="card col" style={{ borderColor: 'var(--bad)', background: 'var(--bad-soft)' }} aria-label="Chamados da cozinha">
          <h2>Cozinha chamando ({avisosAbertos(s).length})</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {avisosAbertos(s).map((a) => (
              <div key={a.id} className="card tight col" style={{ gap: 6, borderColor: a.status === 'visto' ? 'var(--line)' : 'var(--bad)' }}>
                <div className="row between"><b>{nomeMotivo(a.motivo)}</b><b className={'num ' + (a.status === 'visto' ? 'muted' : 'bad')}>{desde(a.ts, now)}</b></div>
                {(a.texto || a.comandaNum) && <span style={{ fontSize: 16, fontWeight: 600 }}>{a.comandaNum ? 'Comanda ' + a.comandaNum + (a.texto ? ' · ' : '') : ''}{a.texto}</span>}
                <span className="small muted">{a.status === 'visto' ? 'Você avisou que está indo · ' + desde(a.vistoEm, now) : 'Ainda sem resposta'}</span>
                <div className="row" style={{ gap: 6 }}>
                  {a.status === 'aberto' && <button type="button" className="btn primary sm" onClick={() => act((d) => A.vistoAviso(d, a.id))}>Vi, estou indo</button>}
                  <button type="button" className="btn sm" onClick={() => act((d) => A.resolverAviso(d, a.id))}>Resolvido</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {ticketsBar(s).length > 0 && (
        <section className="card col" style={{ borderColor: 'var(--info)', background: 'var(--info-soft)' }} aria-label="Pedidos do bar">
          <div className="row between wrap"><h2>Bar: pedidos para separar ({ticketsBar(s).length})</h2><span className="small muted">Bebidas lançadas pelos garçons e pelo QR Code das mesas</span></div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {ticketsBar(s).map(({ c, envio, itens, ts }) => {
              const min = (now - ts) / 60000;
              return (
                <div key={envio} className="card tight col" style={{ gap: 6, borderColor: min > 5 ? 'var(--bad)' : min > 2 ? 'var(--accent)' : 'var(--line)' }}>
                  <div className="row between"><b>{c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome : 'Comanda ' + c.numero}</b><b className={'num ' + (min > 5 ? 'bad' : min > 2 ? 'accent' : 'muted')}>{desde(ts, now)}</b></div>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{itens.map((i) => i.qtd + '× ' + i.nome).join(', ')}</span>
                  <span className="small muted">Comanda {c.numero} · {c.garcom}{itens.some((i) => i.obs) ? ' · ' + itens.filter((i) => i.obs).map((i) => i.obs).join(', ') : ''}</span>
                  <button type="button" className="btn sm" style={{ background: 'var(--info)', borderColor: 'var(--info)', color: '#fff' }} onClick={() => act((d) => A.barPronto(d, c.id, envio))}>Pronto · avisar o garçom</button>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="kpis">
        <Kpi label="Vendas do dia" value={brl(r.total)} sub={r.nVendas + ' pagamentos · ticket médio ' + brl(r.ticket)} />
        <Kpi label="Comandas abertas" value={abertas.length} sub={brl(emAberto) + ' a receber'} />
        <Kpi label="Jogos em andamento" value={emJogo.length + ' de ' + s.mesas.length} sub={acabando.length ? acabando.length + ' mesa(s) acabando ou esgotada(s)' : 'Tudo em dia'} subCls={acabando.length ? 'accent' : 'muted'} />
        <Link to="clientes" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Kpi label="Fiado em aberto" value={brl(r.fiadoTotal)} cls="accent-b" sub={r.devedores.length + ' clientes · ' + r.fiadoAtrasado.length + ' há mais de 30 dias'} />
        </Link>
      </div>
      <div className="row wrap" style={{ alignItems: 'stretch', gap: 16 }}>
        <section className="card col" style={{ flex: '2 1 420px', minWidth: 0, gap: 16 }}>
          <h2>Vendas por forma de pagamento</h2>
          <div className="bars" role="img" aria-label="Divisão das vendas por forma de pagamento">
            {Object.keys(NOMES).map((k) => r.porMetodo[k] > 0 && <div key={k} style={{ width: (r.porMetodo[k] / r.total) * 100 + '%', background: CORES[k] }} />)}
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '10px 24px' }}>
            {Object.keys(NOMES).map((k) => (
              <div key={k} className="row between"><span className="row" style={{ gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: CORES[k], border: '1px solid var(--line-2)' }} />{NOMES[k]}</span><b className="num">{brl(r.porMetodo[k])}</b></div>
            ))}
          </div>
          <h3 className="muted" style={{ fontWeight: 500 }}>Vendas nas últimas 12 horas</h3>
          <div className="row" style={{ alignItems: 'flex-end', height: 120, gap: 6 }} aria-hidden="true">
            {horas.map((h) => <div key={h} title={h + 'h · ' + brl(r.porHora[h])} style={{ flex: 1, height: Math.max(3, (r.porHora[h] / maxH) * 100) + '%', background: h === h0 ? 'var(--accent)' : 'var(--line-2)', borderRadius: '4px 4px 0 0' }} />)}
          </div>
          <div className="row between small muted">{horas.filter((_, k) => k % 2 === 0).map((h) => <span key={h}>{h}h</span>)}</div>
        </section>
        <section className="card col" style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div className="row between"><h2>Fiado: maiores saldos</h2><Link to="clientes" className="small">Ver todos</Link></div>
          <div className="col" style={{ gap: 0 }}>
            {r.devedores.slice(0, 5).map((c) => {
              const d = c.desde ? dias(c.desde, now) : 0;
              return (
                <div key={c.id} className="list-item">
                  <div className="col" style={{ gap: 2 }}><b>{nomeCliente(c)}</b><span className={'small ' + (c.fiado >= c.limite ? 'bad' : d > 30 ? 'accent' : 'muted')}>{d} dias{c.fiado >= c.limite ? ' · bloqueado' : ''}</span></div>
                  <b className="num">{brl(c.fiado)}</b>
                </div>
              );
            })}
          </div>
          <Link className="btn primary" to="clientes" style={{ marginTop: 'auto' }}>Receber ou cobrar fiado</Link>
        </section>
      </div>
      <div className="row wrap" style={{ alignItems: 'stretch', gap: 16 }}>
        <section className="card col" style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div className="row between"><h2>Jogos agora</h2><Link to="jogos" className="small">Abrir</Link></div>
          {s.mesas.map((m) => {
            const e = estadoMesa(m, now, s.config.avisoMin);
            return (
              <div key={m.id} className="list-item">
                <span>{m.nome}{m.sessao ? ' · ' + tipoJogo(m.sessao.jogo).nome + ' (' + m.sessao.jogadores + ')' : ''}</span>
                <b className={'num ' + (e === 'esgotado' ? 'bad' : e === 'acabando' ? 'accent' : e === 'livre' ? 'muted' : '')}>{e === 'livre' ? 'Livre' : e === 'esgotado' ? 'Esgotado' : mmss(m.sessao.fim - now)}</b>
              </div>
            );
          })}
        </section>
        <section className="card col" style={{ flex: '1 1 300px', minWidth: 0 }}>
          <h2>Alertas</h2>
          {r.abaixo.length > 0 && <Link to="estoque" className="card tight bad-b col" style={{ gap: 2, textDecoration: 'none', color: 'inherit' }}><b className="bad">Estoque abaixo do mínimo: {r.abaixo.length} itens</b><span className="small">{r.abaixo.slice(0, 3).map((i) => i.nome).join(', ')}{r.abaixo.length > 3 ? '…' : ''} · sugestão de compra pronta</span></Link>}
          {atrasados.length > 0 && <Link to="cozinha" className="card tight accent-b col" style={{ gap: 2, textDecoration: 'none', color: 'inherit' }}><b className="accent">Cozinha atrasada: {atrasados.length} pedido(s)</b><span className="small">{atrasados.map((t) => 'comanda ' + t.c.numero).join(', ')} · meta 15 min</span></Link>}
          {r.vencendo.length > 0 && <Link to="estoque" className="card tight col" style={{ gap: 2, textDecoration: 'none', color: 'inherit' }}><b>Vencendo em 7 dias: {r.vencendo.length} lote(s)</b><span className="small muted">{r.vencendo.map((i) => i.nome).join(', ')}</span></Link>}
          {r.cancel.length > 0 && <Link to="usuarios" className="card tight col" style={{ gap: 2, textDecoration: 'none', color: 'inherit' }}><b>{r.cancel.length} cancelamento(s) hoje</b><span className="small muted">Ver registro de auditoria</span></Link>}
          {!r.abaixo.length && !atrasados.length && !r.vencendo.length && !r.cancel.length && <div className="empty">Nenhum alerta</div>}
        </section>
      </div>
    </>
  );
}
