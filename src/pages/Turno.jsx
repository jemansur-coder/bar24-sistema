import { useState } from 'react';
import { A, METODOS, brl, hora, resumoTurno, useNow, useStore } from '../store.jsx';
import { Kpi, Modal } from '../ui.jsx';
import { ContagemTurno } from './Estoque.jsx';

// Troca de turno: abrir caixa com fundo de troco, sangria/suprimento, fechar com contagem cega.

const CEDULAS = [200, 100, 50, 20, 10, 5, 2];
const num = (v) => parseFloat(String(v).replace(',', '.')) || 0;
const dataHora = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function AbrirTurno({ compacto = false }) {
  const { s, act } = useStore();
  const [fundo, setFundo] = useState(String(s.caixa.fundoSugerido ?? 200).replace('.', ','));
  return (
    <section className="card col" style={{ maxWidth: 520, borderColor: 'var(--accent)' }}>
      <h2>{compacto ? 'Caixa fechado' : 'Abrir novo turno'}</h2>
      <span className="muted">Conte o troco que fica na gaveta para começar. O turno fica no seu nome.</span>
      <label className="field">Fundo de troco (R$)<input className="input num" inputMode="decimal" value={fundo} onChange={(e) => setFundo(e.target.value)} /></label>
      <button type="button" className="btn primary big" onClick={() => act((d) => A.abrirTurno(d, { fundo: num(fundo) }))}>Abrir turno</button>
    </section>
  );
}

function FecharTurno({ onClose }) {
  const { s, act } = useStore();
  const [qtd, setQtd] = useState({});
  const [moedas, setMoedas] = useState('');
  const [obs, setObs] = useState('');
  const [fechadoId, setFechadoId] = useState(null);
  const contado = Math.round((CEDULAS.reduce((a, c) => a + c * (parseInt(qtd[c], 10) || 0), 0) + num(moedas)) * 100) / 100;
  const t = fechadoId && s.turnos.find((x) => x.id === fechadoId);
  if (t) {
    const r = resumoTurno(s, t);
    const ok = Math.abs(t.diferenca) < 0.01;
    return (
      <Modal titulo="Turno fechado" onClose={onClose}>
        <div className="card tight col" style={{ borderColor: ok ? 'var(--ok)' : 'var(--bad)', background: ok ? 'var(--ok-soft)' : 'var(--bad-soft)', alignItems: 'center' }}>
          <b className={'display ' + (ok ? 'ok' : 'bad')} style={{ fontSize: 26 }}>{ok ? 'Caixa conferiu' : (t.diferenca < 0 ? 'Faltou ' : 'Sobrou ') + brl(Math.abs(t.diferenca))}</b>
          <span className="small muted">Contado {brl(t.contado)} · esperado {brl(t.esperado)}</span>
        </div>
        <div className="col" style={{ gap: 0 }}>
          <div className="list-item"><span>Cartão (conferir com o relatório da maquininha)</span><b className="num">{brl(r.porMetodo.cartao)}</b></div>
          <div className="list-item"><span>Pix (conferir no extrato)</span><b className="num">{brl(r.porMetodo.pix)}</b></div>
          <div className="list-item"><span>Fiado lançado</span><b className="num">{brl(r.porMetodo.fiado)}</b></div>
        </div>
        <span className="muted small">O resumo do turno vai junto no relatório do dono.</span>
        <button type="button" className="btn primary big" onClick={onClose}>Ok</button>
      </Modal>
    );
  }
  return (
    <Modal titulo="Fechar turno · contagem cega" onClose={onClose}>
      <span className="muted">Conte o dinheiro da gaveta e digite quantas notas tem de cada. O sistema só mostra o valor esperado depois de você confirmar.</span>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {CEDULAS.map((c) => (
          <label key={c} className="field">Notas de R$ {c}
            <input className="input num" inputMode="numeric" value={qtd[c] || ''} placeholder="0" onChange={(e) => setQtd({ ...qtd, [c]: e.target.value.replace(/\D/g, '') })} />
          </label>
        ))}
        <label className="field">Moedas (R$)<input className="input num" inputMode="decimal" value={moedas} placeholder="0,00" onChange={(e) => setMoedas(e.target.value)} /></label>
      </div>
      <div className="row between"><span>Total contado</span><b className="display num" style={{ fontSize: 28 }}>{brl(contado)}</b></div>
      <label className="field">Observação (opcional)<input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: troco errado na mesa 4" /></label>
      <button type="button" className="btn primary big" onClick={() => setFechadoId(act((d) => A.fecharTurno(d, { contado, notas: qtd, obs })))}>Confirmar contagem e fechar</button>
    </Modal>
  );
}

function MovCaixa({ tipo, onClose }) {
  const { act } = useStore();
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  return (
    <Modal titulo={tipo === 'sangria' ? 'Sangria (retirar dinheiro)' : 'Suprimento (colocar troco)'} onClose={onClose}>
      <label className="field">Valor (R$)<input className="input num" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus /></label>
      <label className="field">Motivo<input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tipo === 'sangria' ? 'Ex.: depósito no cofre, pagamento de fornecedor' : 'Ex.: troco do cofre'} /></label>
      <button type="button" className="btn primary big" disabled={num(valor) <= 0} onClick={() => { act((d) => A.movCaixa(d, tipo, num(valor), motivo.trim())); onClose(); }}>Confirmar</button>
    </Modal>
  );
}

export default function Turno() {
  const { s } = useStore();
  const now = useNow(30000);
  const [modal, setModal] = useState(null);
  const cx = s.caixa;
  const r = cx.aberto ? resumoTurno(s, cx, now) : null;
  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}>
          <h1>Turno e caixa</h1>
          <span className="muted">{cx.aberto ? 'Turno de ' + cx.operador + ' desde ' + hora(cx.abertoEm) : 'Nenhum turno aberto'}</span>
        </div>
        {cx.aberto && (
          <div className="row wrap">
            <button type="button" className="btn" onClick={() => setModal('sangria')}>Sangria</button>
            <button type="button" className="btn" onClick={() => setModal('suprimento')}>Suprimento</button>
            <button type="button" className="btn" onClick={() => setModal('contagem')}>Contar estoque do bar</button>
            <button type="button" className="btn primary" onClick={() => setModal('fechar')}>Fechar turno</button>
          </div>
        )}
      </div>
      {!cx.aberto && <AbrirTurno />}
      {cx.aberto && (
        <>
          <div className="kpis">
            <Kpi label="Vendas do turno" value={brl(r.vendas)} sub={r.pags.length + ' pagamentos'} />
            <Kpi label="Dinheiro esperado na gaveta" value={brl(r.esperado)} sub={'Fundo ' + brl(cx.fundo) + ' + dinheiro ' + brl(r.porMetodo.dinheiro) + ' − sangrias ' + brl(r.sangrias)} />
            <Kpi label="Cartão + Pix" value={brl(r.porMetodo.cartao + r.porMetodo.pix)} sub={'Cartão ' + brl(r.porMetodo.cartao) + ' · Pix ' + brl(r.porMetodo.pix)} />
            <Kpi label="Cancelamentos no turno" value={r.cancel.length} sub={r.cancel.length ? 'veja em Usuários › auditoria' : 'nenhum'} subCls={r.cancel.length ? 'accent' : 'muted'} />
          </div>
          <div className="row wrap" style={{ alignItems: 'stretch', gap: 16 }}>
            <section className="card col" style={{ flex: '1 1 320px' }}>
              <h2>Formas de pagamento</h2>
              {Object.keys(METODOS).map((k) => <div key={k} className="list-item"><span>{METODOS[k]}</span><b className="num">{brl(r.porMetodo[k])}</b></div>)}
            </section>
            <section className="card col" style={{ flex: '1 1 320px' }}>
              <h2>Sangrias e suprimentos</h2>
              {!cx.movs.length && <div className="empty">Nenhum movimento neste turno</div>}
              {cx.movs.map((m, k) => (
                <div key={k} className="list-item">
                  <div className="col" style={{ gap: 2 }}><b>{m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}{m.motivo ? ' · ' + m.motivo : ''}</b><span className="small muted">{hora(m.ts)} · {m.por}</span></div>
                  <b className={'num ' + (m.tipo === 'sangria' ? 'bad' : 'ok')}>{m.tipo === 'sangria' ? '−' : '+'}{brl(m.valor)}</b>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
      <section className="card col">
        <h2>Turnos anteriores</h2>
        {!s.turnos.length && <div className="empty">Os turnos fechados aparecem aqui</div>}
        {s.turnos.length > 0 && (
          <div className="scroll-x"><table className="table" style={{ minWidth: 640 }}>
            <thead><tr><th>Turno</th><th>Operador</th><th className="r">Vendas</th><th className="r">Esperado</th><th className="r">Contado</th><th className="r">Diferença</th></tr></thead>
            <tbody>
              {s.turnos.slice(0, 20).map((t) => {
                const rt = resumoTurno(s, t);
                const ok = Math.abs(t.diferenca) < 0.01;
                return (
                  <tr key={t.id}>
                    <td>{dataHora(t.abertoEm)} → {hora(t.fechadoEm)}{t.obs ? <div className="small muted">{t.obs}</div> : null}</td>
                    <td>{t.operador}{t.fechadoPor && t.fechadoPor !== t.operador ? <span className="small muted"> · fechou {t.fechadoPor}</span> : null}</td>
                    <td className="r num">{brl(rt.vendas)}</td>
                    <td className="r num">{brl(t.esperado)}</td>
                    <td className="r num">{brl(t.contado)}</td>
                    <td className={'r num ' + (ok ? 'ok' : 'bad')}><b>{ok ? 'Conferiu' : brl(t.diferenca)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>
      {modal === 'contagem' && <Modal titulo="Contagem do estoque do turno" onClose={() => setModal(null)} largura={860}><ContagemTurno /></Modal>}
      {modal === 'fechar' && <FecharTurno onClose={() => setModal(null)} />}
      {(modal === 'sangria' || modal === 'suprimento') && <MovCaixa tipo={modal} onClose={() => setModal(null)} />}
    </>
  );
}
