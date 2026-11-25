import { useState } from 'react';
import { hora, uid, useStore } from '../store.jsx';
import { PAPEIS } from '../seed.js';
import { Modal } from '../ui.jsx';

const ACESSO = {
  Dono: 'Tudo, incluindo fiscal, usuários e financeiro',
  Gerente: 'Gestão, estoque, compras, cancelamentos, descontos e fiado',
  Caixa: 'Frente de caixa, pagamentos, jogos e fiado',
  Garçom: 'Tablet: abrir comanda, lançar pedidos e cobrar',
  Cozinha: 'Painel da cozinha',
  Estoquista: 'Estoque, inventário e pedidos de compra',
};

export default function Usuarios() {
  const { s, act, reset } = useStore();
  const [novo, setNovo] = useState(null);
  const [confirma, setConfirma] = useState(false);
  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}><h1>Usuários</h1><span className="muted">Login por PIN nos terminais</span></div>
        <button type="button" className="btn primary" onClick={() => setNovo({ nome: '', papel: 'Garçom', pin: '', ativo: true })}>+ Novo usuário</button>
      </div>
      <section className="card scroll-x">
        <table className="table" style={{ minWidth: 600 }}>
          <thead><tr><th>Nome</th><th>Papel</th><th>Acesso</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {s.usuarios.map((u) => (
              <tr key={u.id}>
                <td><b>{u.nome}</b></td><td>{u.papel}</td><td className="muted small">{ACESSO[u.papel]}</td>
                <td><span className={'pill ' + (u.ativo ? 'ok' : 'off')}>{u.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
                <td className="r"><button type="button" className="btn sm ghost" onClick={() => setNovo({ ...u })}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card col">
        <h2>Registro de auditoria</h2>
        {!s.log.length && <div className="empty">Cancelamentos, ajustes de estoque e outras ações sensíveis aparecem aqui.</div>}
        {s.log.slice(0, 30).map((l, k) => <div key={k} className="list-item"><span>{l.msg}</span><span className="muted small">{hora(l.ts)}</span></div>)}
      </section>
      <section className="card col">
        <h2>Dados do protótipo</h2>
        <span className="muted">Os dados ficam salvos neste navegador. Use o botão abaixo para voltar aos dados de exemplo.</span>
        <div className="row wrap">{!confirma ? <button type="button" className="btn danger" onClick={() => setConfirma(true)}>Restaurar dados de exemplo</button> : <><span className="bad">Apagar tudo e voltar aos dados de exemplo?</span><button type="button" className="btn danger" onClick={() => { reset(); setConfirma(false); }}>Sim, restaurar</button><button type="button" className="btn" onClick={() => setConfirma(false)}>Não</button></>}</div>
      </section>
      {novo && (
        <Modal titulo={novo.id ? 'Editar usuário' : 'Novo usuário'} onClose={() => setNovo(null)}>
          <label className="field">Nome<input className="input" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
          <label className="field">Papel<select className="input" value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value })}>{PAPEIS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="field">PIN (4 a 6 dígitos)<input className="input" inputMode="numeric" maxLength={6} value={novo.pin} onChange={(e) => setNovo({ ...novo, pin: e.target.value.replace(/\D/g, '') })} /></label>
          <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={novo.ativo} onChange={(e) => setNovo({ ...novo, ativo: e.target.checked })} /> Ativo</label>
          <button type="button" className="btn primary big" disabled={!novo.nome.trim() || novo.pin.length < 4} onClick={() => { act((d) => { if (novo.id) Object.assign(d.usuarios.find((x) => x.id === novo.id), novo); else d.usuarios.push({ ...novo, id: uid('u') }); }); setNovo(null); }}>Salvar</button>
        </Modal>
      )}
    </>
  );
}
