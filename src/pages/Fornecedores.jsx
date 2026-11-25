import { useState } from 'react';
import { brl, uid, useStore } from '../store.jsx';
import { Modal } from '../ui.jsx';

export default function Fornecedores() {
  const { s, act } = useStore();
  const [novo, setNovo] = useState(null);
  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}><h1>Fornecedores</h1><span className="muted">{s.fornecedores.length} cadastrados</span></div>
        <button type="button" className="btn primary" onClick={() => setNovo({ nome: '', cnpj: '', contato: '', prazoDias: 1 })}>+ Novo fornecedor</button>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {s.fornecedores.map((f) => {
          const itens = s.insumos.filter((i) => i.fornecedorId === f.id);
          const compras = s.pedidosCompra.filter((p) => p.fornecedorId === f.id);
          return (
            <div key={f.id} className="card col">
              <div className="col" style={{ gap: 2 }}><h2>{f.nome}</h2><span className="small muted">CNPJ {f.cnpj} · {f.contato}</span></div>
              <div className="row between"><span className="muted">Prazo de entrega</span><b>{f.prazoDias} dia(s)</b></div>
              <div className="row between"><span className="muted">Compras feitas</span><b>{compras.length} · {brl(compras.reduce((a, p) => a + p.valor, 0))}</b></div>
              <span className="small muted">Fornece: {itens.map((i) => i.nome).join(', ') || '—'}</span>
              <button type="button" className="btn sm" onClick={() => setNovo({ ...f })}>Editar</button>
            </div>
          );
        })}
      </div>
      {novo && (
        <Modal titulo={novo.id ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={() => setNovo(null)}>
          {[['nome', 'Razão social / nome'], ['cnpj', 'CNPJ'], ['contato', 'Telefone / WhatsApp']].map(([k, l]) => (
            <label key={k} className="field">{l}<input className="input" value={novo[k]} onChange={(e) => setNovo({ ...novo, [k]: e.target.value })} /></label>
          ))}
          <label className="field">Prazo de entrega (dias)<input className="input" type="number" min="0" value={novo.prazoDias} onChange={(e) => setNovo({ ...novo, prazoDias: parseInt(e.target.value, 10) || 0 })} /></label>
          <button type="button" className="btn primary big" disabled={!novo.nome.trim()} onClick={() => { act((d) => { if (novo.id) Object.assign(d.fornecedores.find((x) => x.id === novo.id), novo); else d.fornecedores.push({ ...novo, id: uid('f') }); }); setNovo(null); }}>Salvar</button>
        </Modal>
      )}
    </>
  );
}
