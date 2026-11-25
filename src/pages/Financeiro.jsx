import { useState } from 'react';
import { METODOS, brl, hora, hoje, resumoTurno, useStore } from '../store.jsx';
import { Link } from '../router.jsx';
import { resumoDia } from '../stats.js';
import { Kpi } from '../ui.jsx';

export default function Financeiro() {
  const { s } = useStore();
  const r = resumoDia(s);
  const [aba, setAba] = useState('caixa');
  const ini = hoje();
  const pags = s.pagamentos.filter((p) => p.ts >= ini).sort((a, b) => b.ts - a.ts);
  const dinheiroCaixa = s.caixa.aberto ? resumoTurno(s, s.caixa).esperado : 0;
  const cmv = s.comandas.reduce((a, c) => a + c.itens.reduce((b, i) => { const p = s.produtos.find((x) => x.id === i.produtoId); return b + (i.enviadoEm >= ini && p ? p.ficha.reduce((k, [iid, q]) => k + q * (s.insumos.find((x) => x.id === iid)?.custo || 0), 0) * i.qtd : 0); }, 0), 0);
  return (
    <>
      <div className="topbar"><div className="col" style={{ gap: 2 }}><h1>Financeiro e notas</h1><span className="muted">Hoje</span></div></div>
      <div className="kpis">
        <Kpi label="Entradas do dia" value={brl(r.total + r.recebFiado)} sub={'Vendas ' + brl(r.total) + ' + fiado recebido ' + brl(r.recebFiado)} />
        <Kpi label="Dinheiro na gaveta (esperado)" value={brl(dinheiroCaixa)} sub={s.caixa.aberto ? 'Turno de ' + s.caixa.operador : 'Caixa fechado'} />
        <Kpi label="Notas emitidas hoje" value={s.notas.filter((n) => n.ts >= ini).length} sub="NFC-e" />
        <Kpi label="Custo dos itens vendidos (CMV)" value={brl(cmv)} sub="pela ficha técnica, comandas de hoje" />
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {[['caixa', 'Caixa'], ['mov', 'Movimentos do dia'], ['notas', 'Notas fiscais']].map(([k, l]) => <button key={k} type="button" className={'chip' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l}</button>)}
      </div>
      {aba === 'caixa' && (
        <section className="card col" style={{ maxWidth: 640 }}>
          <h2>Caixa do turno</h2>
          <span className="muted">Abertura, sangria, suprimento e fechamento com contagem cega ficam na tela Turno e caixa, junto com o histórico de cada turno e as diferenças.</span>
          {s.turnos.slice(0, 3).map((t) => <div key={t.id} className="list-item"><span>{t.operador} · {hora(t.abertoEm)} → {hora(t.fechadoEm)}</span><b className={'num ' + (Math.abs(t.diferenca) < 0.01 ? 'ok' : 'bad')}>{Math.abs(t.diferenca) < 0.01 ? 'Conferiu' : brl(t.diferenca)}</b></div>)}
          <Link className="btn primary" to="turno">Abrir Turno e caixa</Link>
        </section>
      )}
      {aba === 'mov' && (
        <section className="card scroll-x">
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th>Hora</th><th>Origem</th><th>Forma</th><th className="r">Valor</th></tr></thead>
            <tbody>{pags.map((p) => <tr key={p.id}><td className="muted">{hora(p.ts)}</td><td>{p.origem}</td><td>{METODOS[p.metodo]}</td><td className="r num"><b>{brl(p.valor)}</b></td></tr>)}</tbody>
          </table>
        </section>
      )}
      {aba === 'notas' && (
        <section className="card col">
          <div className="card tight muted">Protótipo: as notas são simuladas. Na versão final a NFC-e/NF-e é emitida por uma API fiscal com o certificado digital do bar, e os XMLs vão para o contador.</div>
          {!s.notas.length && <div className="empty">Nenhuma nota ainda. Feche uma comanda com "Emitir NFC-e" marcado.</div>}
          {s.notas.length > 0 && (
            <div className="scroll-x"><table className="table" style={{ minWidth: 560 }}>
              <thead><tr><th>Nº</th><th>Tipo</th><th>Hora</th><th>Comanda</th><th>CPF</th><th>Status</th><th className="r">Valor</th></tr></thead>
              <tbody>{s.notas.map((n) => <tr key={n.id}><td>{n.numero}</td><td>{n.tipo}</td><td className="muted">{hora(n.ts)}</td><td>{n.comanda}</td><td className="muted">{n.cpf || '—'}</td><td className="ok">{n.status}</td><td className="r num"><b>{brl(n.valor)}</b></td></tr>)}</tbody>
            </table></div>
          )}
        </section>
      )}
    </>
  );
}
