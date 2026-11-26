import { useState } from 'react';
import { A, METODOS, brl, ehGestor, hora, mmss, nomeCliente, useNow, useStore } from '../store.jsx';
import { precoFicha, resumoSinuca, saldoFichas, sessoesSinuca, ultimaConferencia } from '../sinuca.js';
import { BotaoPOS } from '../integracoes/BotaoPOS.jsx';
import { useOperador, usePinGestor } from '../sessao.jsx';
import { Modal } from '../ui.jsx';
import { Link } from '../router.jsx';

const COBRANCAS = [['comanda', 'Na comanda'], ['dinheiro', 'Dinheiro'], ['cartao', 'Cartão'], ['pix', 'Pix']];
const nomeCobranca = (k) => (k === 'comanda' ? 'Comanda' : METODOS[k] || k);

// Venda de fichas para uma mesa de sinuca. Se a mesa está livre, abre a mesa já com as fichas.
// Usada no Jogos (caixa) e na maquininha do garçom.
export function VenderFichas({ mesa, onFeito, compacto = false }) {
  const { s, act } = useStore();
  const se = mesa.sessao;
  const preco = precoFicha(s);
  const abertas = s.comandas.filter((c) => c.status === 'aberta');
  const vinculada = se?.comandaId && abertas.find((c) => c.id === se.comandaId);
  const [qtd, setQtd] = useState(1);
  const [cobranca, setCobranca] = useState(vinculada ? 'comanda' : 'dinheiro');
  const [comandaId, setComanda] = useState(vinculada?.id || '');
  const [pos, setPos] = useState(null); // resultado da maquininha/Pix
  const valor = Math.round(preco * qtd * 100) / 100;
  const precisaPOS = cobranca === 'cartao' || cobranca === 'pix';
  const pode = qtd > 0 && (cobranca !== 'comanda' || comandaId) && (!precisaPOS || pos);
  const confirmar = () => {
    act((d) => {
      const opc = { metodo: cobranca === 'comanda' ? 'dinheiro' : cobranca, comandaId: cobranca === 'comanda' ? comandaId : null, ref: pos?.nsu || null };
      if (!d.mesas.find((m) => m.id === mesa.id)?.sessao) A.iniciarJogo(d, mesa.id, { jogo: 'ficha', jogadores: qtd, ...opc });
      else {
        // comanda escolhida passa a ser a da mesa; "na hora" desvincula
        A.vincularComanda(d, mesa.id, opc.comandaId);
        const semSaldo = saldoFichas(d.mesas.find((m) => m.id === mesa.id).sessao) === 0;
        A.venderFichas(d, mesa.id, qtd, { ...opc, iniciar: false });
        if (semSaldo) A.novaPartida(d, mesa.id);
      }
    });
    onFeito?.(`${qtd} ficha(s) · ${mesa.nome} · ${brl(valor)} · ${cobranca === 'comanda' ? 'comanda ' + abertas.find((c) => c.id === comandaId)?.numero : nomeCobranca(cobranca)}`);
    setQtd(1); setPos(null);
  };
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="field">Quantas fichas? <span className="small muted">({brl(preco)} cada · cada ficha é uma partida)</span>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={() => { setQtd(Math.max(1, qtd - 1)); setPos(null); }} aria-label="Menos uma ficha">−</button>
          <b className="display num grow" style={{ fontSize: 30, textAlign: 'center', color: 'var(--text)' }}>{qtd}</b>
          <button type="button" className="btn" onClick={() => { setQtd(qtd + 1); setPos(null); }} aria-label="Mais uma ficha">+</button>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>{[1, 2, 3, 5, 10].map((q) => <button key={q} type="button" className={'btn sm' + (qtd === q ? ' sel' : '')} onClick={() => { setQtd(q); setPos(null); }}>{q}</button>)}</div>
      </div>
      <div className="field">Cobrança
        <div className="grid" style={{ gridTemplateColumns: compacto ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 8 }}>
          {COBRANCAS.map(([k, l]) => <button key={k} type="button" className={'btn sm' + (cobranca === k ? ' sel' : '')} onClick={() => { setCobranca(k); setPos(null); }}>{l}</button>)}
        </div>
        {cobranca === 'comanda' && (
          <select className="input" value={comandaId} onChange={(e) => setComanda(e.target.value)} aria-label="Comanda">
            <option value="">Escolha a comanda</option>
            {abertas.map((c) => <option key={c.id} value={c.id}>{c.numero}{c.mesaId ? ' · ' + (s.mesasSalao.find((m) => m.id === c.mesaId)?.nome || '') : ''}{c.clienteId ? ' · ' + nomeCliente(s.clientes.find((k) => k.id === c.clienteId)) : ''}</option>)}
          </select>
        )}
        {cobranca === 'comanda' && <span className="small muted">As fichas entram na conta como "Ficha sinuca · {mesa.nome}". As próximas fichas desta mesa vão para a mesma comanda.</span>}
        {precisaPOS && <BotaoPOS valor={valor} metodo={cobranca} descricao={`${qtd} ficha(s) ${mesa.nome}`} referencia={mesa.id} aprovado={pos} onAprovado={setPos} className="btn" />}
      </div>
      <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><b>Total</b><b className="display num accent" style={{ fontSize: 28 }}>{brl(valor)}</b></div>
      <button type="button" className="btn primary big" disabled={!pode} onClick={confirmar}>
        {!se ? 'Abrir ' + mesa.nome + ' com ' + qtd + ' ficha(s)' : cobranca === 'comanda' ? 'Lançar ' + qtd + ' ficha(s) na comanda' : 'Registrar ' + qtd + ' ficha(s) pagas'}
      </button>
    </div>
  );
}

// Extrato de fichas de uma sessão (ou do histórico da mesa)
function Extrato({ lanc }) {
  if (!lanc?.length) return <span className="small muted">Nenhum lançamento.</span>;
  return (
    <div className="col" style={{ gap: 0, maxHeight: 220, overflow: 'auto' }}>
      {[...lanc].reverse().map((l) => (
        <div key={l.id} className="list-item" style={{ padding: '8px 0' }}>
          <span className="small">{hora(l.ts)} · <b className={l.qtd < 0 ? 'bad' : ''}>{l.qtd > 0 ? '+' : ''}{l.qtd} ficha(s)</b> · {l.qtd < 0 ? 'estorno' : nomeCobranca(l.cobranca)}{l.comandaNum ? ' ' + l.comandaNum : ''} · {l.por}{l.autorizou ? ' (aut. ' + l.autorizou + ')' : ''}{l.ref ? ' · NSU ' + l.ref : ''}</span>
          <b className={'num small ' + (l.qtd < 0 ? 'bad' : '')}>{brl(l.valor)}</b>
        </div>
      ))}
    </div>
  );
}

function Estornar({ mesa, onClose }) {
  const { act } = useStore();
  const se = mesa.sessao; const saldo = saldoFichas(se);
  const [qtd, setQtd] = useState(Math.min(1, saldo));
  const [motivo, setMotivo] = useState('');
  const { aut, campo } = usePinGestor();
  return (
    <Modal titulo={'Estornar fichas · ' + mesa.nome} onClose={onClose}>
      <span>Só dá para estornar fichas <b>ainda não jogadas</b> (saldo da mesa: <b>{saldo}</b>). Fica registrado com quem pediu e quem autorizou e gera alerta para o dono.</span>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn" onClick={() => setQtd(Math.max(1, qtd - 1))} aria-label="Menos">−</button>
        <b className="display num grow" style={{ fontSize: 28, textAlign: 'center' }}>{qtd}</b>
        <button type="button" className="btn" onClick={() => setQtd(Math.min(saldo, qtd + 1))} aria-label="Mais">+</button>
      </div>
      <label className="field">Motivo<input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente desistiu, lançado errado" /></label>
      {campo}
      <button type="button" className="btn danger big" disabled={!aut || !motivo.trim() || qtd < 1 || qtd > saldo} onClick={() => { act((d) => A.estornarFichas(d, mesa.id, qtd, aut.nome, motivo.trim())); onClose(); }}>Estornar {qtd} ficha(s)</button>
    </Modal>
  );
}

// Painel da mesa de sinuca em andamento
export function GerenciarFicha({ mesa, onClose }) {
  const { s, act } = useStore();
  const now = useNow();
  const [estorno, setEstorno] = useState(false);
  const [confirmaFim, setConfirmaFim] = useState(false);
  const [msg, setMsg] = useState('');
  const [aba, setAba] = useState('vender');
  const se = mesa.sessao; const saldo = saldoFichas(se);
  const abertas = s.comandas.filter((c) => c.status === 'aberta');
  const cmd = se.comandaId && abertas.find((c) => c.id === se.comandaId);
  return (
    <Modal titulo={mesa.nome + ' · sinuca por ficha'} onClose={onClose} largura={600}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
        <div className="card tight col" style={{ gap: 0, alignItems: 'center' }}><span className="small muted">Ficha atual</span><b className="display num" style={{ fontSize: 34 }}>{se.usadas}<span className="muted" style={{ fontSize: 18 }}>/{se.fichas}</span></b></div>
        <div className="card tight col" style={{ gap: 0, alignItems: 'center', borderColor: saldo ? undefined : 'var(--warn)' }}><span className="small muted">Saldo (não jogadas)</span><b className={'display num ' + (saldo ? '' : 'accent')} style={{ fontSize: 34 }}>{saldo}</b></div>
        <div className="card tight col" style={{ gap: 0, alignItems: 'center' }}><span className="small muted">Total da mesa</span><b className="display num" style={{ fontSize: 26 }}>{brl(se.valor)}</b></div>
      </div>
      <div className="row between wrap small"><span className="muted">Aberta às {hora(se.inicio)} · partida atual há <b className="num">{mmss(Math.max(0, now - (se.partidaEm || se.inicio)))}</b></span><span className="muted">{cmd ? 'Comanda ' + cmd.numero : 'Fichas pagas na hora'}{se.estornadas ? ' · ' + se.estornadas + ' estornada(s)' : ''}</span></div>
      {msg && <div className="ok">{msg}</div>}
      <button type="button" className="btn primary big" disabled={!saldo} onClick={() => { act((d) => A.novaPartida(d, mesa.id)); setMsg('Partida ' + (se.usadas + 1) + ' liberada. Restam ' + (saldo - 1) + ' ficha(s).'); setTimeout(() => setMsg(''), 3000); }}>
        {saldo ? `Liberar próxima partida (usa 1 ficha · restam ${saldo - 1})` : 'Sem fichas: venda mais abaixo'}
      </button>
      <div className="row" style={{ gap: 8 }} role="tablist">
        {[['vender', 'Vender fichas'], ['extrato', 'Extrato da mesa (' + se.lanc.length + ')']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={aba === k} className={'chip' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l}</button>)}
      </div>
      {aba === 'vender' ? <VenderFichas key={se.fichas} mesa={mesa} onFeito={(t) => { setMsg('Lançado: ' + t); setTimeout(() => setMsg(''), 3500); }} /> : <Extrato lanc={se.lanc} />}
      <div className="row wrap" style={{ gap: 8, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <Link className="btn sm" to={'parede-' + mesa.id}>Tela da parede</Link>
        <button type="button" className="btn sm" disabled={!saldo} onClick={() => setEstorno(true)}>Estornar ficha não jogada</button>
        <button type="button" className="btn sm danger" style={{ marginLeft: 'auto' }} onClick={() => { if (saldo && !confirmaFim) { setConfirmaFim(true); return; } act((d) => A.encerrarJogo(d, mesa.id)); onClose(); }}>{confirmaFim ? 'Confirmar: encerrar mesmo assim' : 'Encerrar e liberar mesa'}</button>
      </div>
      {saldo > 0 && <span className={'small ' + (confirmaFim ? 'bad' : 'muted')}>Ao encerrar, as {saldo} ficha(s) do saldo contam como jogadas (ficam cobradas). Se o cliente desistiu, estorne antes.</span>}
      {estorno && <Estornar mesa={mesa} onClose={() => setEstorno(false)} />}
    </Modal>
  );
}

function ConferirCofre({ mesa, onClose }) {
  const { s, act } = useStore();
  const ant = ultimaConferencia(s, mesa.id);
  const [contado, setContado] = useState('');
  const [obs, setObs] = useState('');
  const [feito, setFeito] = useState(null);
  const n = parseInt(contado, 10);
  if (feito) {
    const c = s.conferenciasFichas.find((x) => x.id === feito);
    return (
      <Modal titulo={'Cofre conferido · ' + mesa.nome} onClose={onClose}>
        <div className={'card tight col ' + (c.dif ? 'bad-b' : '')} style={{ gap: 4 }}>
          <b className={c.dif ? 'bad' : 'ok'} style={{ fontSize: 20 }}>{!c.dif ? 'Conferiu: ' + c.contado + ' ficha(s)' : c.dif > 0 ? c.dif + ' ficha(s) A MAIS no cofre' : -c.dif + ' ficha(s) a menos no cofre'}</b>
          <span className="small">{c.dif > 0 ? `Foram jogadas ${c.dif} partida(s) sem lançamento no sistema (${brl(c.valor)}). O dono recebe o alerta.` : c.dif < 0 ? 'Pode ser ficha vendida que o cliente ainda não colocou na mesa, ou ficha perdida. Fica registrado.' : 'Tudo certo. A próxima conferência começa a contar a partir de agora.'}</span>
        </div>
        <button type="button" className="btn primary big" onClick={onClose}>Fechar</button>
      </Modal>
    );
  }
  return (
    <Modal titulo={'Conferir cofre · ' + mesa.nome} onClose={onClose}>
      <span>Abra o cofre (contador) da mesa, conte as fichas e digite abaixo <b>sem olhar o esperado</b>. O sistema compara com as partidas registradas {ant ? 'desde ' + new Date(ant.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' (' + ant.por + ')' : 'desde o início'}.</span>
      <label className="field">Fichas contadas no cofre<input className="input num" inputMode="numeric" autoFocus value={contado} onChange={(e) => setContado(e.target.value.replace(/\D/g, ''))} /></label>
      <label className="field">Observação (opcional)<input className="input" value={obs} onChange={(e) => setObs(e.target.value)} /></label>
      {mesa.sessao && saldoFichas(mesa.sessao) > 0 && <span className="small muted">A mesa está em jogo com {saldoFichas(mesa.sessao)} ficha(s) ainda na mão do cliente: elas não entram no esperado.</span>}
      <button type="button" className="btn primary big" disabled={contado === '' || Number.isNaN(n)} onClick={() => setFeito(act((d) => A.conferirCofre(d, mesa.id, n, obs.trim())))}>Registrar conferência</button>
    </Modal>
  );
}

// Painel de controle das fichas por mesa (hoje): vendidas, estornadas, partidas, receita, cofre
export function ControleFichas() {
  const { s, act } = useStore();
  const { usuario } = useOperador();
  const gestor = ehGestor(usuario);
  useNow(30000); // atualiza o painel periodicamente
  const now = Date.now(); // sempre o instante do render, para incluir lançamentos recém-feitos
  const ini = new Date(now).setHours(0, 0, 0, 0);
  const r = resumoSinuca(s, ini, now);
  const [cofre, setCofre] = useState(null);
  const [mesaHist, setMesaHist] = useState('');
  const [preco, setPreco] = useState(String(precoFicha(s)).replace('.', ','));
  const hist = sessoesSinuca(s, mesaHist || null).filter((x) => (x.fim || now) >= ini).sort((a, b) => b.inicio - a.inicio);
  const alertas = s.alertasEstoque.filter((a) => a.tipo === 'fichas' && a.ts >= ini);
  return (
    <section className="card col" aria-label="Controle de fichas por mesa">
      <div className="row between wrap">
        <div className="col" style={{ gap: 2 }}><h2>Controle de fichas por mesa · hoje</h2><span className="small muted">Sinuca é cobrada por ficha (partida), não por tempo. Cada mesa tem o próprio controle.</span></div>
        {gestor && (
          <label className="row small" style={{ gap: 6 }}>Preço da ficha
            <input className="input num" style={{ width: 80, height: 34 }} inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} onBlur={() => { const v = parseFloat(preco.replace(',', '.')); if (v > 0) act((d) => { d.config.precoFicha = v; A.log(d, 'Preço da ficha de sinuca alterado para ' + brl(v) + ' por ' + (usuario?.nome || '')); }); }} aria-label="Preço da ficha em reais" />
          </label>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 640 }}>
          <thead><tr><th>Mesa</th><th className="r">Vendidas</th><th className="r">Estornadas</th><th className="r">Partidas</th><th className="r">Receita</th><th className="r">Média/partida</th><th className="r">Saldo agora</th><th>Cofre</th></tr></thead>
          <tbody>
            {r.linhas.map((l) => (
              <tr key={l.mesa.id}>
                <td><b>{l.mesa.nome}</b><div className="small muted">{l.sessoes} sessão(ões) · {Math.floor(l.ocupadoMin / 60)}h{String(l.ocupadoMin % 60).padStart(2, '0')} em uso</div></td>
                <td className="r num">{l.vendidas}</td>
                <td className={'r num ' + (l.estornadas ? 'bad' : '')}>{l.estornadas}</td>
                <td className="r num">{l.partidas}</td>
                <td className="r num"><b>{brl(l.receita)}</b><div className="small muted">{brl(l.naComanda)} em comanda</div></td>
                <td className="r num">{l.mediaPartidaMin ? l.mediaPartidaMin + ' min' : '—'}</td>
                <td className="r num">{l.mesa.sessao ? l.saldoAgora : '—'}</td>
                <td><div className="col" style={{ gap: 4 }}>
                  <span className="small muted">{l.conf ? 'Última: ' + hora(l.conf.ts) + ' · ' + l.conf.por + (l.conf.dif ? ' · dif. ' + (l.conf.dif > 0 ? '+' : '') + l.conf.dif : ' · ok') : 'Nunca conferido'}</span>
                  {gestor && <span className="small">Desde então: <b>{l.desdeConf}</b> partida(s)</span>}
                  <button type="button" className="btn sm" onClick={() => setCofre(l.mesa)}>Conferir cofre</button>
                </div></td>
              </tr>
            ))}
            <tr><td><b>Total</b></td><td className="r num"><b>{r.total.vendidas}</b></td><td className="r num">{r.total.estornadas}</td><td className="r num"><b>{r.total.partidas}</b></td><td className="r num"><b>{brl(r.total.receita)}</b></td><td /><td /><td /></tr>
          </tbody>
        </table>
      </div>
      {alertas.length > 0 && (
        <div className="card tight bad-b col" style={{ gap: 4 }}>
          <b className="bad">Alertas de fichas hoje ({alertas.length})</b>
          {alertas.slice(0, 5).map((a) => <span key={a.id} className="small">{hora(a.ts)} · {a.texto}</span>)}
        </div>
      )}
      <div className="row wrap" style={{ gap: 20, alignItems: 'flex-start' }}>
        <div className="col" style={{ flex: '1 1 260px', gap: 4 }}>
          <h3 style={{ margin: 0 }}>Fichas por funcionário</h3>
          {Object.entries(r.porPessoa).sort((a, b) => b[1].vendidas - a[1].vendidas).map(([n, v]) => <div key={n} className="list-item" style={{ padding: '6px 0' }}><span>{n}</span><span className="num small">{v.vendidas} vendida(s){v.estornadas ? <b className="bad"> · {v.estornadas} estornada(s)</b> : ''} · <b>{brl(v.valor)}</b></span></div>)}
          {!Object.keys(r.porPessoa).length && <span className="small muted">Nenhuma ficha hoje</span>}
        </div>
        <div className="col" style={{ flex: '2 1 340px', gap: 6 }}>
          <div className="row between wrap"><h3 style={{ margin: 0 }}>Sessões de hoje</h3>
            <select className="input" style={{ width: 160, height: 34 }} value={mesaHist} onChange={(e) => setMesaHist(e.target.value)} aria-label="Filtrar mesa">
              <option value="">Todas as mesas</option>{s.mesas.filter((m) => m.tipo === 'sinuca').map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div className="col" style={{ gap: 0, maxHeight: 260, overflow: 'auto' }}>
            {hist.map((h) => (
              <div key={(h.id || h.mesaId) + h.inicio} className="list-item" style={{ padding: '8px 0' }}>
                <span className="small"><b>{h.mesaNome}</b> · {hora(h.inicio)}–{h.ativa ? 'agora' : hora(h.fim)} · {h.fichas} ficha(s), {(h.partidas || []).length} partida(s){h.estornadas ? ' · ' + h.estornadas + ' estornada(s)' : ''}{h.sobraCobrada ? ' · ' + h.sobraCobrada + ' não jogada(s) cobrada(s)' : ''} · {h.comandaNum || (h.lanc || []).map((l) => nomeCobranca(l.cobranca)).filter((x, k, a) => a.indexOf(x) === k).join('/')}</span>
                <b className="num small">{brl(h.valor)}</b>
              </div>
            ))}
            {!hist.length && <span className="small muted">Nenhuma sessão hoje</span>}
          </div>
        </div>
      </div>
      {cofre && <ConferirCofre mesa={cofre} onClose={() => setCofre(null)} />}
    </section>
  );
}
