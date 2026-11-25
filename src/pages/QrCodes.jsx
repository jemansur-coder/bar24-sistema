import { useState } from 'react';
import { A, desde, uid, useNow, useStore } from '../store.jsx';
import { QR, linkPublico } from '../qr.jsx';

export default function QrCodes() {
  const { s, act } = useStore();
  const now = useNow(15000);
  const [nova, setNova] = useState('');
  const pend = s.chamados.filter((c) => !c.atendido);
  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}><h1>Mesas e QR Codes</h1><span className="muted">Imprima e cole um QR em cada mesa. O cliente abre o cardápio, chama o garçom, vê a conta e paga a parte dele no Pix.</span></div>
      </div>
      <div className="card tight muted small">Os QR Codes apontam para o endereço onde o sistema estiver publicado. Na prévia, use "Ver como cliente" para testar; depois de subir na Vercel, a câmera do celular abre direto.</div>
      {pend.length > 0 && (
        <section className="card accent-b col">
          <h2>Chamados abertos</h2>
          {pend.map((c) => <div key={c.id} className="list-item"><span>{s.mesasSalao.find((m) => m.id === c.mesaId)?.nome} · {c.motivo === 'pedido' ? 'enviou um pedido' : c.motivo === 'conta' ? 'pediu a conta' : 'chamou o garçom'}</span><span className="muted small">há {desde(c.ts, now)}</span></div>)}
        </section>
      )}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        <div className="card col" style={{ alignItems: 'center', textAlign: 'center', borderColor: 'var(--felt)' }}>
          <b className="display" style={{ fontSize: 20 }}>Fila de jogos</b>
          <QR texto={linkPublico('fila')} tamanho={160} titulo="QR Code da fila de jogos" />
          <span className="small muted">Para colar perto da sinuca e das mesas de cartas</span>
          <a className="btn sm" href="#fila">Ver como cliente</a>
        </div>
        {s.mesasSalao.map((m) => {
          const c = s.comandas.find((x) => x.status === 'aberta' && x.mesaId === m.id);
          return (
            <div key={m.id} className="card col" style={{ alignItems: 'center', textAlign: 'center' }}>
              <b className="display" style={{ fontSize: 20 }}>{m.nome}</b>
              <QR texto={linkPublico('mesa-' + m.id)} tamanho={160} titulo={'QR Code da ' + m.nome} />
              <span className="small muted">{c ? 'Comanda ' + c.numero + ' aberta' : 'Sem conta aberta'}</span>
              <a className="btn sm" href={'#mesa-' + m.id}>Ver como cliente</a>
            </div>
          );
        })}
      </div>
      <div className="row wrap" style={{ maxWidth: 480 }}>
        <input className="input grow" placeholder="Nome da nova mesa (ex.: Mesa 9, Varanda 1)" aria-label="Nome da nova mesa" value={nova} onChange={(e) => setNova(e.target.value)} />
        <button type="button" className="btn primary" disabled={!nova.trim()} onClick={() => { act((d) => { d.mesasSalao.push({ id: uid('m'), nome: nova.trim() }); }); setNova(''); }}>Adicionar mesa</button>
      </div>
    </>
  );
}
