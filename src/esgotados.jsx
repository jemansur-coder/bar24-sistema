import { useState } from 'react';
import { A, useStore } from './store.jsx';
import { Modal } from './ui.jsx';
import { FotoProduto } from './fotos.jsx';

// Marcar produto esgotado com um toque. Some na hora do cardápio do cliente, do caixa e do garçom.
export function EsgotadosModal({ destino, onClose }) {
  const { s, act } = useStore();
  const [busca, setBusca] = useState('');
  const lista = s.produtos.filter((p) => p.ativo && (!destino || p.destino === destino) && (!busca || p.nome.toLowerCase().includes(busca.toLowerCase())));
  return (
    <Modal titulo="Produtos esgotados" onClose={onClose}>
      <span className="muted">Toque para marcar o que acabou. Some na hora do cardápio do cliente, do caixa e do garçom. Toque de novo quando voltar.</span>
      <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" />
      <div className="col" style={{ gap: 0 }}>
        {lista.map((p) => (
          <button key={p.id} type="button" className="list-item" style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--line)', color: 'var(--text)', cursor: 'pointer', textAlign: 'left', width: '100%' }} aria-pressed={!!p.esgotado} onClick={() => act((d) => A.esgotar(d, p.id, !p.esgotado))}>
            <div className="row" style={{ gap: 12 }}>
              <FotoProduto produto={p} tamanho={44} raio={10} style={{ filter: p.esgotado ? 'grayscale(1)' : 'none', opacity: p.esgotado ? 0.6 : 1 }} />
              <div className="col" style={{ gap: 2 }}><b>{p.nome}</b>{p.esgotado && <span className="small muted">por {p.esgotadoPor}</span>}</div>
            </div>
            <span className={'pill ' + (p.esgotado ? 'bad' : 'ok')} style={{ minWidth: 92, textAlign: 'center' }}>{p.esgotado ? 'ESGOTADO' : 'TEM'}</span>
          </button>
        ))}
      </div>
      <button type="button" className="btn primary big" onClick={onClose}>Pronto</button>
    </Modal>
  );
}

// faixa no topo das telas da equipe
export function FaixaEsgotados() {
  const { s } = useStore();
  const [aberto, setAberto] = useState(false);
  const esg = s.produtos.filter((p) => p.ativo && p.esgotado);
  if (!esg.length) return null;
  return (
    <>
      <div className="faixa-esg" role="status">
        <b>ESGOTADO AGORA:</b>
        <span className="grow">{esg.map((p) => p.nome).join(' · ')}</span>
        <button type="button" className="btn sm ghost" onClick={() => setAberto(true)}>Gerenciar</button>
      </div>
      {aberto && <EsgotadosModal onClose={() => setAberto(false)} />}
    </>
  );
}
