import { useState } from 'react';
import { A, METODOS, brl, dias, nomeCliente, uid, useStore } from '../store.jsx';
import { Kpi, Modal } from '../ui.jsx';

export default function Clientes() {
  const { s, act } = useStore();
  const [busca, setBusca] = useState('');
  const [receber, setReceber] = useState(null);
  const [novo, setNovo] = useState(null);
  const [valor, setValor] = useState('');
  const [metodo, setMetodo] = useState('pix');
  const lista = s.clientes.filter((c) => (nomeCliente(c) + ' ' + c.tel).toLowerCase().includes(busca.toLowerCase())).sort((a, b) => b.fiado - a.fiado);
  const devedores = s.clientes.filter((c) => c.fiado > 0);
  const total = devedores.reduce((a, c) => a + c.fiado, 0);
  const atrasados = devedores.filter((c) => c.desde && dias(c.desde) > 30);
  const msgWhats = (c) => `Olá ${c.nome}! Aqui é do ${s.config.nomeBar}. Seu saldo em aberto é de ${brl(c.fiado)}. Pode pagar por Pix ou no caixa. Obrigado!`;

  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}><h1>Clientes e fiado</h1><span className="muted">{s.clientes.length} clientes cadastrados</span></div>
        <button type="button" className="btn primary" onClick={() => setNovo({ nome: '', apelido: '', tel: '', limite: 300 })}>+ Novo cliente</button>
      </div>
      <div className="kpis">
        <Kpi label="Fiado em aberto" value={brl(total)} cls="accent-b" sub={devedores.length + ' clientes'} />
        <Kpi label="Há mais de 30 dias" value={atrasados.length} cls={atrasados.length ? 'bad-b' : ''} sub={brl(atrasados.reduce((a, c) => a + c.fiado, 0))} />
        <Kpi label="Recebido hoje" value={brl(s.pagamentos.filter((p) => p.tipo === 'recebimento' && p.ts > new Date().setHours(0, 0, 0, 0)).reduce((a, p) => a + p.valor, 0))} />
      </div>
      <label className="field" style={{ maxWidth: 360 }}>Buscar<input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, apelido ou telefone" /></label>
      <section className="card scroll-x">
        <table className="table" style={{ minWidth: 720 }}>
          <thead><tr><th>Cliente</th><th>Telefone</th><th>Saldo fiado</th><th>Limite</th><th>Devendo há</th><th className="r">Ações</th></tr></thead>
          <tbody>
            {lista.map((c) => {
              const d = c.desde ? dias(c.desde) : null;
              return (
                <tr key={c.id}>
                  <td><b>{nomeCliente(c)}</b></td>
                  <td className="muted">{c.tel || '—'}</td>
                  <td><b className={c.fiado >= c.limite ? 'bad' : c.fiado ? 'accent' : 'muted'}>{brl(c.fiado)}</b></td>
                  <td className="muted">{brl(c.limite)}</td>
                  <td className={d > 30 ? 'bad' : 'muted'}>{d != null && c.fiado ? d + ' dias' + (c.fiado >= c.limite ? ' · bloqueado' : '') : '—'}</td>
                  <td className="r">
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      {c.fiado > 0 && <button type="button" className="btn sm primary" onClick={() => { setReceber(c); setValor(c.fiado.toFixed(2).replace('.', ',')); }}>Receber</button>}
                      {c.fiado > 0 && <a className="btn sm" href={'https://wa.me/' + (c.tel || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(msgWhats(c))} target="_blank" rel="noreferrer">Cobrar no WhatsApp</a>}
                      <button type="button" className="btn sm ghost" onClick={() => setNovo({ ...c })}>Editar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {receber && (
        <Modal titulo={'Receber fiado · ' + nomeCliente(receber)} onClose={() => setReceber(null)}>
          <div className="row between"><span className="muted">Saldo</span><b className="display num" style={{ fontSize: 26 }}>{brl(receber.fiado)}</b></div>
          <label className="field">Valor recebido<input className="input num" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></label>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
            {['pix', 'dinheiro', 'cartao'].map((k) => <button key={k} type="button" className={'btn' + (metodo === k ? ' sel' : '')} onClick={() => setMetodo(k)}>{METODOS[k]}</button>)}
          </div>
          <button type="button" className="btn primary big" onClick={() => { const v = Math.min(receber.fiado, parseFloat(valor.replace(',', '.')) || 0); if (v > 0) act((d) => A.receberFiado(d, receber.id, metodo, v)); setReceber(null); }}>Confirmar recebimento</button>
        </Modal>
      )}
      {novo && (
        <Modal titulo={novo.id ? 'Editar cliente' : 'Novo cliente'} onClose={() => setNovo(null)}>
          {[['nome', 'Nome'], ['apelido', 'Apelido'], ['tel', 'Telefone / WhatsApp']].map(([k, l]) => <label key={k} className="field">{l}<input className="input" value={novo[k]} onChange={(e) => setNovo({ ...novo, [k]: e.target.value })} /></label>)}
          <label className="field">Limite de fiado (R$)<input className="input" type="number" value={novo.limite} onChange={(e) => setNovo({ ...novo, limite: parseFloat(e.target.value) || 0 })} /></label>
          <button type="button" className="btn primary big" disabled={!novo.nome.trim()} onClick={() => { act((d) => { if (novo.id) Object.assign(d.clientes.find((x) => x.id === novo.id), novo); else d.clientes.push({ ...novo, id: uid('c'), fiado: 0, desde: null }); }); setNovo(null); }}>Salvar</button>
        </Modal>
      )}
    </>
  );
}
