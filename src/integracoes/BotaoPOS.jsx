import { useState } from 'react';
import { brl } from '../store.jsx';
import { cobrar, cobrancaDeTeste, naPOS } from './pagamento.js';

// Botão que manda a cobrança para a maquininha (ou gera o Pix) e avisa quando aprovar.
// Toda a comunicação passa por integracoes/pagamento.js (hoje simulado).
export function BotaoPOS({ valor, metodo = 'cartao', descricao = '', referencia = '', onAprovado, aprovado = null, className = 'btn sm' }) {
  const [estado, setEstado] = useState('');
  if (aprovado) return <span className="ok"><b>Aprovado · {brl(aprovado.valor)}</b>{aprovado.nsu ? <span className="small muted"> · NSU {aprovado.nsu}</span> : null}</span>;
  const ir = async () => {
    setEstado('aguardando');
    const r = await cobrar({ valor, metodo, descricao, referencia });
    if (r.aprovado) { setEstado(''); onAprovado?.(r); } else setEstado(r.mensagem || 'Não aprovado');
  };
  return (
    <div className="col" style={{ gap: 4 }}>
      <button type="button" className={className} disabled={estado === 'aguardando' || !(valor > 0)} onClick={ir}>
        {estado === 'aguardando' ? (metodo === 'pix' ? 'Aguardando o Pix…' : 'Aguardando a maquininha…') : (metodo === 'pix' ? 'Gerar Pix de ' : 'Cobrar na maquininha ') + brl(valor)}
      </button>
      {estado && estado !== 'aguardando' && <span className="small bad">{estado}</span>}
      {cobrancaDeTeste() && <span className="small muted">{naPOS() ? 'Maquininha em modo teste: aprova sozinho, nada é cobrado.' : 'Simulação: aprova sozinho em 1 segundo.'}</span>}
    </div>
  );
}
