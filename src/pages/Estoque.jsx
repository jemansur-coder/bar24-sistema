import { useMemo, useState } from 'react';
import { A, brl, dias, ehGestor, sugestaoCompra, useStore } from '../store.jsx';
import { GRUPOS_ESTOQUE, MOTIVOS_SAIDA } from '../seed.js';
import { Kpi, Modal } from '../ui.jsx';
import { FotoProduto } from '../fotos.jsx';
import { useOperador } from '../sessao.jsx';

// Estoque: tabela por item (estilo painel de distribuição), entradas e saídas com motivo,
// histórico de movimentações, contagem cega do turno e divergências (controle anti-furto).

const fmtQ = (q, un) => (un === 'g' && Math.abs(q) >= 1000 ? (q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' kg' : un === 'ml' && Math.abs(q) >= 1000 ? (q / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' L' : (Math.round(q * 10) / 10).toLocaleString('pt-BR') + ' ' + un);
const fmtDias = (d) => (d < 1 ? '~' + Math.max(1, Math.round(d * 24)) + ' h' : '~' + Math.round(d) + ' dia' + (Math.round(d) > 1 ? 's' : ''));
// destilados aparecem em garrafas e doses
export const fmtItem = (i, q = i.estoque) => (i.garrafaMl ? (q / i.garrafaMl).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' garrafa(s) · ' + Math.round(q / i.doseMl) + ' doses' : fmtQ(q, i.un));
const dataHora = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const num = (v) => parseFloat(String(v).replace(',', '.'));
export const TIPOS_MOV = { venda: ['Venda', ''], entrada: ['Entrada', 'ok'], contagem: ['Ajuste de contagem', 'accent'], perda: ['Perda', 'bad'], quebra: ['Quebra', 'bad'], vencido: ['Venceu', 'bad'], consumo: ['Consumo da equipe', 'bad'], cortesia: ['Cortesia', 'bad'] };

function fotoDe(s, i) {
  const p = s.produtos.find((x) => (x.ficha || []).some(([id]) => id === i.id) && (x.ficha || []).length === 1) || s.produtos.find((x) => (x.ficha || []).some(([id]) => id === i.id));
  return p || { id: i.id, nome: i.nome, cat: i.grupo === 'Destilados' ? 'Doses' : i.grupo === 'Cozinha' ? 'Lanches' : 'Cervejas' };
}

function usePinGestor() {
  const { s } = useStore();
  const { usuario } = useOperador();
  const [pin, setPin] = useState('');
  const gestor = ehGestor(usuario);
  const aut = gestor ? usuario : s.usuarios.find((u) => u.pin === pin && ehGestor(u) && u.ativo);
  const campo = gestor ? <span className="small muted">Você ({usuario.nome}) autoriza. Fica registrado no seu nome.</span> : (
    <label className="field">PIN do gerente ou do dono para autorizar
      <input className="input" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      {pin.length === 4 && !aut && <span className="bad">PIN não autorizado</span>}
    </label>
  );
  return { aut, campo };
}

function Movimentar({ item, tipo, onClose }) {
  const { act } = useStore();
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('perda');
  const [obs, setObs] = useState('');
  const { aut, campo } = usePinGestor();
  const emGarrafa = !!item.garrafaMl;
  const q = (num(qtd) || 0) * (emGarrafa ? item.doseMl : 1);
  const saida = tipo === 'saida';
  return (
    <Modal titulo={(saida ? 'Saída sem venda · ' : 'Entrada · ') + item.nome} onClose={onClose}>
      <span className="muted">Estoque atual: <b>{fmtItem(item)}</b></span>
      <label className="field">Quantidade ({emGarrafa ? 'doses de ' + item.doseMl + ' ml' : item.un})<input className="input num" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} autoFocus /></label>
      {saida && (
        <div className="field">Motivo
          <div className="row wrap" style={{ gap: 6 }}>{MOTIVOS_SAIDA.map(([k, l]) => <button key={k} type="button" className={'chip' + (motivo === k ? ' on' : '')} onClick={() => setMotivo(k)}>{l}</button>)}</div>
        </div>
      )}
      <label className="field">{saida ? 'O que aconteceu' : 'Observação (nota, fornecedor)'}<input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder={saida ? 'Ex.: garrafa caiu na reposição' : 'Ex.: compra no atacado, NF 1234'} /></label>
      {saida && campo}
      {!saida && <span className="small muted">Para compras com pedido, use "Pedidos de compra": a entrada fica conferida com o que foi pedido.</span>}
      <button type="button" className={'btn big ' + (saida ? 'danger' : 'primary')} disabled={!(q > 0) || (saida && (!aut || !obs.trim()))}
        onClick={() => { act((d) => (saida ? A.saidaEstoque(d, item.id, q, motivo, obs.trim(), aut.nome) : A.entradaAvulsa(d, item.id, q, obs.trim()))); onClose(); }}>
        {saida ? 'Registrar saída' : 'Registrar entrada'}
      </button>
    </Modal>
  );
}

function Historico({ item, onClose }) {
  const { s } = useStore();
  const movs = s.movsEstoque.filter((m) => m.insumoId === item.id).slice(-60).reverse();
  return (
    <Modal titulo={'Movimentações · ' + item.nome} onClose={onClose} largura={720}>
      <span className="muted">Estoque atual: <b>{fmtItem(item)}</b> · mínimo {fmtItem(item, item.minimo)}</span>
      <div className="scroll-x"><table className="table" style={{ minWidth: 600 }}>
        <thead><tr><th>Quando</th><th>Tipo</th><th className="r">Qtd</th><th>Quem</th><th>Detalhe</th></tr></thead>
        <tbody>{movs.map((m) => (
          <tr key={m.id}>
            <td className="muted">{dataHora(m.ts)}</td>
            <td className={TIPOS_MOV[m.tipo]?.[1]}><b>{TIPOS_MOV[m.tipo]?.[0] || m.tipo}</b></td>
            <td className={'r num ' + (m.qtd < 0 ? '' : 'ok')}>{m.qtd > 0 ? '+' : ''}{fmtItem(item, m.qtd).split(' · ')[item.garrafaMl ? 1 : 0]}</td>
            <td>{m.por}{m.autorizou && m.autorizou !== m.por ? <span className="small muted"> · aut. {m.autorizou}</span> : null}</td>
            <td className="small muted">{[m.ref, m.obs].filter(Boolean).join(' · ')}</td>
          </tr>
        ))}</tbody>
      </table></div>
      {!movs.length && <div className="empty">Sem movimentações</div>}
    </Modal>
  );
}

function TabelaEstoque() {
  const { s } = useStore();
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('');
  const [filtro, setFiltro] = useState('');
  const [ordem, setOrdem] = useState(['codigo', 1]);
  const [modal, setModal] = useState(null);
  const ultima = useMemo(() => { const u = {}; s.movsEstoque.forEach((m) => { u[m.insumoId] = m.ts; }); return u; }, [s.movsEstoque]);
  const lista = s.insumos
    .filter((i) => (!grupo || i.grupo === grupo) && (!busca || (i.nome + ' ' + i.codigo + ' ' + i.grupo).toLowerCase().includes(busca.toLowerCase())))
    .filter((i) => !filtro || (filtro === 'abaixo' ? i.estoque <= i.minimo : filtro === 'zerado' ? i.estoque <= 0 : i.controle))
    .sort((a, b) => { const [k, dir] = ordem; const va = k === 'ultima' ? ultima[a.id] || 0 : k === 'estoque' ? a.estoque / (a.minimo || 1) : a[k]; const vb = k === 'ultima' ? ultima[b.id] || 0 : k === 'estoque' ? b.estoque / (b.minimo || 1) : b[k]; return (va > vb ? 1 : va < vb ? -1 : 0) * dir; });
  const Th = ({ k, children, r }) => <th className={r ? 'r' : ''} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setOrdem([k, ordem[0] === k ? -ordem[1] : 1])}>{children} {ordem[0] === k ? (ordem[1] > 0 ? '▲' : '▼') : '↕'}</th>;
  return (
    <section className="card col" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row wrap" style={{ gap: 10, padding: '16px 16px 0' }}>
        <input className="input" style={{ flex: '2 1 260px' }} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, código ou grupo" aria-label="Buscar no estoque" />
        <select className="input" style={{ flex: '1 1 160px' }} value={grupo} onChange={(e) => setGrupo(e.target.value)} aria-label="Grupo"><option value="">Todos os grupos</option>{GRUPOS_ESTOQUE.map((g) => <option key={g}>{g}</option>)}</select>
        <select className="input" style={{ flex: '1 1 160px' }} value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Situação"><option value="">Todos os estoques</option><option value="abaixo">Abaixo do mínimo</option><option value="zerado">Zerados</option><option value="controle">Itens de controle (contados no turno)</option></select>
      </div>
      <div className="scroll-x"><table className="table" style={{ minWidth: 980 }}>
        <thead><tr><Th k="codigo">Código</Th><Th k="nome">Produto</Th><Th k="grupo">Grupo</Th><Th k="estoque" r>Estoque atual</Th><th className="r">Mín.</th><Th k="ultima">Última movimentação</Th><th></th></tr></thead>
        <tbody>
          {lista.map((i) => {
            const baixo = i.estoque <= i.minimo;
            return (
              <tr key={i.id}>
                <td className="accent num"><b>{i.codigo}</b></td>
                <td><div className="row" style={{ gap: 12 }}><FotoProduto produto={fotoDe(s, i)} tamanho={44} raio={10} /><div className="col" style={{ gap: 2 }}><b>{i.nome}</b>{i.controle && <span className="small muted">Contado no fim do turno</span>}</div></div></td>
                <td><span className="pill off">{i.grupo}</span></td>
                <td className={'r num ' + (baixo ? 'bad' : '')}><b style={{ fontSize: 16 }}>{fmtItem(i)}</b></td>
                <td className="r num muted">{fmtItem(i, i.minimo).split(' · ')[0]}</td>
                <td className="muted num">{ultima[i.id] ? dataHora(ultima[i.id]) : '—'}</td>
                <td><div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn sm" onClick={() => setModal({ t: 'entrada', i })}>Entrada</button>
                  <button type="button" className="btn sm" onClick={() => setModal({ t: 'saida', i })}>Saída</button>
                  <button type="button" className="btn sm ghost" onClick={() => setModal({ t: 'hist', i })}>Histórico</button>
                </div></td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      {!lista.length && <div className="empty" style={{ margin: 16 }}>Nenhum item com esse filtro</div>}
      {modal?.t === 'hist' && <Historico item={modal.i} onClose={() => setModal(null)} />}
      {(modal?.t === 'entrada' || modal?.t === 'saida') && <Movimentar item={s.insumos.find((x) => x.id === modal.i.id)} tipo={modal.t} onClose={() => setModal(null)} />}
    </section>
  );
}

export function ContagemTurno() {
  const { s, act } = useStore();
  const itens = s.insumos.filter((i) => i.controle);
  const [cont, setCont] = useState({});
  const [feito, setFeito] = useState(null);
  const pronto = itens.every((i) => cont[i.id] !== undefined && cont[i.id] !== '' && !isNaN(num(cont[i.id])));
  const ct = feito && s.contagens.find((x) => x.id === feito);
  if (ct) {
    const falta = ct.itens.filter((x) => x.dif < 0); const sobra = ct.itens.filter((x) => x.dif > 0);
    return (
      <section className="card col" style={{ borderColor: falta.length ? 'var(--bad)' : 'var(--ok)' }}>
        <h2 className={falta.length ? 'bad' : 'ok'}>{falta.length ? 'Contagem com diferença: ' + brl(Math.abs(falta.reduce((a, x) => a + x.valor, 0))) + ' faltando' : 'Contagem conferiu'}</h2>
        {[...falta, ...sobra].map((x) => { const i = s.insumos.find((k) => k.id === x.insumoId); return <div key={x.insumoId} className="list-item"><span><b>{i.nome}</b> · esperado {fmtItem(i, x.esperado)} · contado {fmtItem(i, x.contado)}</span><b className={x.dif < 0 ? 'bad' : 'ok'}>{x.dif < 0 ? 'Faltou ' : 'Sobrou '}{fmtItem(i, Math.abs(x.dif)).split(' · ')[i.garrafaMl ? 1 : 0]} · {brl(Math.abs(x.valor))}</b></div>; })}
        <span className="small muted">O estoque foi ajustado para o que foi contado. A diferença vai para o dashboard, para o relatório da noite e para o ranking de divergências.</span>
        <button type="button" className="btn" onClick={() => { setFeito(null); setCont({}); }}>Nova contagem</button>
      </section>
    );
  }
  return (
    <section className="card col">
      <div className="col" style={{ gap: 2 }}><h2>Contagem cega do fim do turno</h2><span className="small muted">Conte os itens de controle e digite o que tem. O sistema só mostra o esperado depois de confirmar. Destilados: conte em garrafas (ex.: 1,5 = uma cheia e outra pela metade).</span></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {itens.map((i) => (
          <label key={i.id} className="card tight row" style={{ gap: 10 }}>
            <FotoProduto produto={fotoDe(s, i)} tamanho={44} raio={10} />
            <div className="col grow" style={{ gap: 4 }}><b style={{ color: 'var(--text)' }}>{i.nome}</b>
              <input className="input num" inputMode="decimal" placeholder={i.garrafaMl ? 'garrafas' : i.un} value={cont[i.id] ?? ''} onChange={(e) => setCont({ ...cont, [i.id]: e.target.value })} aria-label={'Contagem de ' + i.nome} />
            </div>
          </label>
        ))}
      </div>
      <button type="button" className="btn primary big" disabled={!pronto} onClick={() => setFeito(act((d) => A.contagemTurno(d, Object.fromEntries(itens.map((i) => [i.id, num(cont[i.id]) * (i.garrafaMl || 1)])))))}>Confirmar contagem</button>
    </section>
  );
}

function Movimentacoes() {
  const { s } = useStore();
  const [tipo, setTipo] = useState('semvenda');
  const lista = s.movsEstoque.filter((m) => (tipo === 'todas' ? true : tipo === 'semvenda' ? !['venda', 'entrada'].includes(m.tipo) : m.tipo === tipo)).slice(-150).reverse();
  return (
    <section className="card col">
      <div className="row wrap" style={{ gap: 8 }}>{[['semvenda', 'Saídas sem venda e ajustes'], ['entrada', 'Entradas'], ['venda', 'Vendas'], ['todas', 'Todas']].map(([k, l]) => <button key={k} type="button" className={'chip' + (tipo === k ? ' on' : '')} onClick={() => setTipo(k)}>{l}</button>)}</div>
      <div className="scroll-x"><table className="table" style={{ minWidth: 760 }}>
        <thead><tr><th>Quando</th><th>Item</th><th>Tipo</th><th className="r">Qtd</th><th className="r">Valor</th><th>Quem</th><th>Detalhe</th></tr></thead>
        <tbody>{lista.map((m) => { const i = s.insumos.find((k) => k.id === m.insumoId); if (!i) return null; return (
          <tr key={m.id}>
            <td className="muted num">{dataHora(m.ts)}</td><td><b>{i.nome}</b></td>
            <td className={TIPOS_MOV[m.tipo]?.[1]}><b>{TIPOS_MOV[m.tipo]?.[0] || m.tipo}</b></td>
            <td className="r num">{m.qtd > 0 ? '+' : ''}{fmtItem(i, m.qtd).split(' · ')[i.garrafaMl ? 1 : 0]}</td>
            <td className="r num muted">{brl(Math.abs(m.qtd * i.custo))}</td>
            <td>{m.por}{m.autorizou && m.autorizou !== m.por ? <span className="small muted"> · aut. {m.autorizou}</span> : null}</td>
            <td className="small muted">{[m.ref, m.obs].filter(Boolean).join(' · ')}</td>
          </tr>); })}</tbody>
      </table></div>
      {!lista.length && <div className="empty">Nada por aqui</div>}
    </section>
  );
}

// ranking de divergências: faltas na contagem (pelo responsável do turno) + saídas sem venda (por quem lançou)
export function rankingDivergencias(s, desde = 0) {
  const pessoas = {}; const itens = {};
  const add = (obj, k, v, n = 1) => { obj[k] = obj[k] || { valor: 0, n: 0 }; obj[k].valor += v; obj[k].n += n; };
  s.contagens.filter((c) => c.ts >= desde).forEach((c) => c.itens.filter((x) => x.dif < 0).forEach((x) => { add(pessoas, c.turno, -x.valor); add(itens, x.insumoId, -x.valor); }));
  s.movsEstoque.filter((m) => m.ts >= desde && ['perda', 'quebra', 'vencido', 'consumo', 'cortesia'].includes(m.tipo)).forEach((m) => { const i = s.insumos.find((k) => k.id === m.insumoId); const v = -m.qtd * (i?.custo || 0); add(pessoas, m.por, v); add(itens, m.insumoId, v); });
  const ord = (o) => Object.entries(o).sort((a, b) => b[1].valor - a[1].valor);
  return { pessoas: ord(pessoas), itens: ord(itens) };
}

function Divergencias() {
  const { s, act } = useStore();
  const [periodo, setPeriodo] = useState(7);
  const r = rankingDivergencias(s, Date.now() - periodo * 86400000);
  const max = Math.max(1, ...r.pessoas.map(([, v]) => v.valor));
  return (
    <>
      <div className="row wrap" style={{ gap: 8 }}>{[[1, 'Hoje'], [7, '7 dias'], [30, '30 dias']].map(([k, l]) => <button key={k} type="button" className={'chip' + (periodo === k ? ' on' : '')} onClick={() => setPeriodo(k)}>{l}</button>)}</div>
      <div className="row wrap" style={{ alignItems: 'stretch', gap: 16 }}>
        <section className="card col" style={{ flex: '1 1 340px' }}>
          <div className="col" style={{ gap: 2 }}><h2>Por funcionário</h2><span className="small muted">Faltas na contagem do turno dele + saídas sem venda que ele lançou</span></div>
          {!r.pessoas.length && <div className="empty">Nenhuma divergência no período</div>}
          {r.pessoas.map(([nome, v]) => (
            <div key={nome} className="col" style={{ gap: 4 }}>
              <div className="row between"><b>{nome}</b><b className="num bad">{brl(v.valor)}</b></div>
              <div className="bars"><div style={{ width: (v.valor / max) * 100 + '%', background: 'var(--bad)' }} /></div>
              <span className="small muted">{v.n} ocorrência(s)</span>
            </div>
          ))}
        </section>
        <section className="card col" style={{ flex: '1 1 340px' }}>
          <h2>Por produto</h2>
          {r.itens.map(([id, v]) => { const i = s.insumos.find((k) => k.id === id); return <div key={id} className="list-item"><span>{i?.nome}</span><span className="num"><b className="bad">{brl(v.valor)}</b> <span className="small muted">· {v.n}×</span></span></div>; })}
          {!r.itens.length && <div className="empty">Nenhuma divergência no período</div>}
        </section>
      </div>
      <section className="card col">
        <h2>Alertas de estoque</h2>
        {!s.alertasEstoque.length && <div className="empty">Nenhum alerta</div>}
        {s.alertasEstoque.slice(0, 30).map((a) => (
          <div key={a.id} className="list-item">
            <div className="col" style={{ gap: 2 }}><b className={a.visto ? '' : 'bad'}>{a.texto}</b><span className="small muted">{dataHora(a.ts)}{a.valor ? ' · ' + brl(Math.abs(a.valor)) : ''}{a.visto ? ' · visto por ' + (a.vistoPor || '') : ''}</span></div>
            {!a.visto && <button type="button" className="btn sm" onClick={() => act((d) => A.vistoAlertaEstoque(d, a.id))}>Vi</button>}
          </div>
        ))}
      </section>
    </>
  );
}

function ReceberPedido({ pc, onClose }) {
  const { act } = useStore();
  // ml e g são conferidos em litros e quilos, que é como a mercadoria chega
  const fator = (l) => (l.un === 'ml' || l.un === 'g' ? 1000 : 1);
  const unid = (l) => (l.un === 'ml' ? 'L' : l.un === 'g' ? 'kg' : l.un);
  const [rec, setRec] = useState(Object.fromEntries(pc.linhas.map((l) => [l.insumoId, String(Math.round((l.qtd / fator(l)) * 100) / 100).replace('.', ',')])));
  const [nf, setNf] = useState('');
  const difs = pc.linhas.filter((l) => Math.abs((num(rec[l.insumoId]) || 0) * fator(l) - l.qtd) > 0.5);
  return (
    <Modal titulo={'Conferir entrega · ' + pc.numero} onClose={onClose}>
      <span className="muted">Conte o que chegou. Se for diferente do pedido, o sistema registra e avisa o gerente.</span>
      {pc.linhas.map((l) => (
        <div key={l.insumoId} className="list-item">
          <div className="col" style={{ gap: 2 }}><b>{l.nome}</b><span className="small muted">Pedido: {fmtQ(l.qtd, l.un)} · digite em {unid(l)}</span></div>
          <input className="input num" style={{ width: 120 }} inputMode="decimal" value={rec[l.insumoId]} onChange={(e) => setRec({ ...rec, [l.insumoId]: e.target.value })} aria-label={'Recebido de ' + l.nome} />
        </div>
      ))}
      <label className="field">Número da nota fiscal<input className="input" value={nf} onChange={(e) => setNf(e.target.value)} placeholder="Ex.: 4471" /></label>
      {difs.length > 0 && <span className="small bad"><b>{difs.length} item(ns) diferente(s) do pedido.</b> Vai gerar alerta.</span>}
      <button type="button" className="btn primary big" onClick={() => { act((d) => A.receberPedido(d, pc.id, Object.fromEntries(pc.linhas.map((l) => [l.insumoId, Math.round((num(rec[l.insumoId]) || 0) * fator(l))])), nf.trim())); onClose(); }}>Confirmar entrada</button>
    </Modal>
  );
}

export default function Estoque() {
  const { s, act } = useStore();
  const sug = sugestaoCompra(s);
  const precisa = sug.filter((x) => x.precisa);
  const [marcados, setMarcados] = useState(() => new Set(precisa.map((x) => x.id)));
  const [prodId, setProd] = useState('x-tudo');
  const [aba, setAba] = useState('estoque');
  const [recebendo, setRecebendo] = useState(null);
  const naoVistos = s.alertasEstoque.filter((a) => !a.visto).length;
  const valorEstoque = s.insumos.reduce((a, i) => a + i.estoque * i.custo, 0);
  const vencendo = s.insumos.filter((i) => i.validade && i.validade - Date.now() < 7 * 86400000);
  const abaixo = s.insumos.filter((i) => i.estoque <= i.minimo);
  const sel = precisa.filter((x) => marcados.has(x.id));
  const prod = s.produtos.find((p) => p.id === prodId);
  const custoProd = (prod?.ficha || []).reduce((a, [iid, q]) => a + q * (s.insumos.find((x) => x.id === iid)?.custo || 0), 0);

  return (
    <>
      <div className="topbar">
        <div className="col" style={{ gap: 2 }}><h1>Estoque e compras</h1><span className="muted">Baixa automática pela ficha técnica a cada pedido enviado · toda saída fica com nome, hora e motivo</span></div>
      </div>
      <div className="kpis">
        <Kpi label="Valor em estoque" value={brl(valorEstoque)} />
        <Kpi label="Abaixo do mínimo" value={abaixo.length + ' itens'} cls={abaixo.length ? 'bad-b' : ''} />
        <Kpi label="Vencendo em 7 dias" value={vencendo.length + ' lotes'} cls={vencendo.length ? 'accent-b' : ''} />
        <Kpi label="Divergências não vistas" value={naoVistos} cls={naoVistos ? 'bad-b' : ''} sub="contagem, saídas e cancelamentos" />
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {[['estoque', 'Estoque'], ['contagem', 'Contagem do turno'], ['movs', 'Movimentações'], ['div', 'Divergências' + (naoVistos ? ' (' + naoVistos + ')' : '')], ['sugestao', 'Sugestão de compra'], ['pedidos', 'Pedidos de compra'], ['ficha', 'Ficha técnica']].map(([k, l]) => <button key={k} type="button" className={'chip' + (aba === k ? ' on' : '')} onClick={() => setAba(k)}>{l}</button>)}
      </div>

      {aba === 'sugestao' && (
        <section className="card col" style={{ borderColor: 'var(--accent)' }}>
          <div className="row between wrap">
            <div className="col" style={{ gap: 2 }}><h2>Sugestão de compra</h2><span className="small muted">Consumo médio diário × (prazo do fornecedor + 7 dias) − estoque atual</span></div>
            <button type="button" className="btn primary" disabled={!sel.length} onClick={() => { act((d) => A.gerarPedidosCompra(d, sel)); setMarcados(new Set()); setAba('pedidos'); }}>
              Gerar pedidos ({new Set(sel.map((x) => x.fornecedorId)).size} fornecedor(es) · {brl(sel.reduce((a, x) => a + x.valor, 0))})
            </button>
          </div>
          {!precisa.length ? <div className="empty">Estoque em dia. Nada para comprar agora.</div> : (
            <div className="scroll-x">
              <table className="table" style={{ minWidth: 760 }}>
                <thead><tr><th></th><th>Item</th><th>Estoque</th><th>Acaba em</th><th>Comprar</th><th>Fornecedor</th><th className="r">Estimado</th></tr></thead>
                <tbody>
                  {precisa.map((x) => (
                    <tr key={x.id}>
                      <td><input type="checkbox" aria-label={'Comprar ' + x.nome} checked={marcados.has(x.id)} onChange={(e) => { const n = new Set(marcados); e.target.checked ? n.add(x.id) : n.delete(x.id); setMarcados(n); }} /></td>
                      <td><b>{x.nome}</b></td>
                      <td>{fmtQ(x.estoque, x.un)}</td>
                      <td className={x.diasRest < 1 ? 'bad' : 'accent'}><b>{fmtDias(x.diasRest)}</b></td>
                      <td><b>{fmtQ(x.qtd, x.un)}</b></td>
                      <td className="muted">{x.fornecedor?.nome} · entrega {x.prazo} dia(s)</td>
                      <td className="r num"><b>{brl(x.valor)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {aba === 'estoque' && <TabelaEstoque />}
      {aba === 'contagem' && <ContagemTurno />}
      {aba === 'movs' && <Movimentacoes />}
      {aba === 'div' && <Divergencias />}

      {aba === 'pedidos' && (
        <section className="card col">
          <h2>Pedidos de compra</h2>
          {!s.pedidosCompra.length && <div className="empty">Nenhum pedido ainda. Gere a partir da sugestão de compra.</div>}
          {s.pedidosCompra.map((pc) => {
            const f = s.fornecedores.find((x) => x.id === pc.fornecedorId);
            return (
              <div key={pc.id} className="card tight col" style={{ gap: 8 }}>
                <div className="row between wrap">
                  <b>{pc.numero} · {f?.nome}</b>
                  <div className="row"><span className={'pill ' + (pc.status === 'recebido' ? 'ok' : 'warn')}>{pc.status === 'recebido' ? 'RECEBIDO' : 'AGUARDANDO ENTREGA'}</span><b className="num">{brl(pc.valor)}</b></div>
                </div>
                <span className="small muted">{pc.linhas.map((l) => fmtQ(l.qtd, l.un) + ' ' + l.nome).join(' · ')}</span>
                {pc.status !== 'recebido' && <div className="row wrap"><button type="button" className="btn sm primary" onClick={() => setRecebendo(pc)}>Conferir e dar entrada</button><span className="small muted">Na versão final: importar o XML da nota do fornecedor.</span></div>}
                {pc.status === 'recebido' && <span className={'small ' + (pc.divergencias?.length ? 'bad' : 'muted')}>Recebido por {pc.recebidoPor || '—'}{pc.nf ? ' · NF ' + pc.nf : ''}{pc.divergencias?.length ? ' · ' + pc.divergencias.join('; ') : ' · conferido com o pedido'}</span>}
              </div>
            );
          })}
        </section>
      )}

      {aba === 'ficha' && (
        <section className="card col" style={{ maxWidth: 640 }}>
          <label className="field">Produto
            <select className="input" value={prodId} onChange={(e) => setProd(e.target.value)}>{s.produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          </label>
          {(prod?.ficha || []).map(([iid, q]) => { const i = s.insumos.find((x) => x.id === iid); return <div key={iid} className="list-item"><span>{i?.nome}</span><span className="muted">{fmtQ(q, i?.un)} · {brl(q * (i?.custo || 0))}</span></div>; })}
          {prod && <div className="row between"><span className="muted">Custo · Preço · Margem</span><b>{brl(custoProd)} · {brl(prod.preco)} · <span className="ok">{Math.round((1 - custoProd / prod.preco) * 100)}%</span></b></div>}
        </section>
      )}
      {recebendo && <ReceberPedido pc={recebendo} onClose={() => setRecebendo(null)} />}
    </>
  );
}
