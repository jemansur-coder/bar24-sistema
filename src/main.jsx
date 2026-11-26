import { StrictMode, useEffect, useRef, useState } from 'react';
import { Logo, TemaBtn, bip } from './ui.jsx';
import { createRoot } from 'react-dom/client';
import { ir, useRota } from './router.jsx';
import './styles.css';
import { A, avisosAbertos, contasParaLevar, eventosCozinha, prontosParaLevar, StoreProvider, desde, estadoMesa, nomeCliente, ticketsBar, useNow, useStore } from './store.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Caixa, { abrirConta } from './pages/Caixa.jsx';
import Jogos from './pages/Jogos.jsx';
import { Parede, ParedeTodas } from './pages/Parede.jsx';
import Cozinha from './pages/Cozinha.jsx';
import Garcom from './pages/Garcom.jsx';
import Estoque from './pages/Estoque.jsx';
import Fornecedores from './pages/Fornecedores.jsx';
import Clientes from './pages/Clientes.jsx';
import Financeiro from './pages/Financeiro.jsx';
import Relatorio from './pages/Relatorio.jsx';
import Usuarios from './pages/Usuarios.jsx';
import QrCodes from './pages/QrCodes.jsx';
import Produtos from './pages/Produtos.jsx';
import { ClienteFila, ClienteMesa } from './pages/Cliente.jsx';
import { nomeMotivo } from './pages/Cozinha.jsx';
import Salao from './pages/Salao.jsx';
import Turno from './pages/Turno.jsx';
import { Avatar, OperadorProvider, TelaPin, inicial, podeVer, useOperador } from './sessao.jsx';
import { FaixaEsgotados } from './esgotados.jsx';

function Alertas() {
  const { s, act } = useStore();
  const { usuario } = useOperador();
  const doBar = ['Dono', 'Gerente', 'Caixa'].includes(usuario?.papel);
  const now = useNow(1000);
  const esgotadas = s.mesas.filter((m) => estadoMesa(m, now) === 'esgotado' && !m.sessao.visto);
  // pedidos prontos (cozinha ou bar) aguardando o garçom. O garçom só recebe os da comanda dele.
  const ehGarcom = usuario?.papel === 'Garçom';
  const prontos = usuario?.papel === 'Cozinha' ? [] : prontosParaLevar(s, ehGarcom ? usuario.nome : null);
  const chamados = s.chamados.filter((c) => !c.atendido);
  const rotaAtual = useRota();
  // no dashboard os pedidos do bar já aparecem no quadro próprio
  const bar = rotaAtual === '' || !doBar ? [] : ticketsBar(s);
  // chamados da cozinha: toast fora do dashboard e da própria cozinha
  const avisos = doBar ? avisosAbertos(s).filter((a) => a.status === 'aberto') : [];
  const avisosToast = rotaAtual === '' || rotaAtual === 'cozinha' ? [] : avisos;
  // caixa/bar acompanha a cozinha: pedido novo e "em preparo" aparecem por alguns segundos
  const cozinhaEv = doBar ? eventosCozinha(s, now) : [];
  // garçom: conta emitida pelo caixa para levar à mesa
  const contas = ehGarcom ? contasParaLevar(s, usuario.nome) : [];
  const nomeMesa = (c) => (c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome : 'Balcão');
  const conhecidos = useRef(null);
  useEffect(() => {
    const chaves = new Set([...esgotadas.map((m) => 'm' + m.id), ...prontos.map((p) => 'p' + p.envio + p.origem), ...chamados.map((c) => 'c' + c.id), ...bar.map((b) => 'b' + b.envio), ...avisos.map((a) => 'a' + a.id), ...cozinhaEv.map((k) => 'k' + k.chave), ...contas.map((c) => 'n' + c.id)]);
    if (conhecidos.current) {
      const novos = [...chaves].filter((k) => !conhecidos.current.has(k));
      if (novos.some((k) => k[0] === 'm')) bip(660, 0.3, 4);
      else if (novos.some((k) => k[0] === 'a') && rotaAtual !== 'cozinha') bip(784, 0.18, 3);
      else if (novos.length) bip(1046, 0.12, 2);
      if (ehGarcom && novos.some((k) => k[0] === 'p' || k[0] === 'n')) { try { navigator.vibrate?.([200, 100, 200]); } catch (e) { /* sem vibração */ } }
    }
    conhecidos.current = chaves;
  });
  // repete o som a cada 6s enquanto houver mesa esgotada sem confirmação
  useEffect(() => {
    if (!esgotadas.length) return;
    const t = setInterval(() => bip(660, 0.3, 2), 6000);
    return () => clearInterval(t);
  }, [esgotadas.length]);

  return (
    <>
      {esgotadas.map((m) => (
        <div className="alarm" role="alert" key={m.id}>
          <div className="row">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3" /></svg>
            <div className="col" style={{ gap: 2 }}>
              <b>{m.nome.toUpperCase()} — TEMPO ESGOTADO</b>
              <span>{m.sessao.jogadores} jogador(es) · acabou às {new Date(m.sessao.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="row wrap">
            <button type="button" className="btn" style={{ background: '#fff', color: '#7A0D13', borderColor: '#fff' }} onClick={() => ir('jogos-' + m.id)}>Renovar / encerrar</button>
            <button type="button" className="btn ghost" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => act((d) => A.silenciar(d, m.id))}>Silenciar</button>
          </div>
        </div>
      ))}
      {rotaAtual !== 'cozinha' && (prontos.length > 0 || chamados.length > 0 || bar.length > 0 || avisosToast.length > 0 || cozinhaEv.length > 0 || contas.length > 0) && (
        <div className="toasts">
          {contas.map((c) => (
            <div className="toast" role="alert" key={'n' + c.id} style={{ borderColor: 'var(--warn)', background: 'var(--accent-soft)' }}>
              <div className="col grow" style={{ gap: 4 }}>
                <span className="t" style={{ color: 'var(--warn)' }}>CAIXA · CONTA PRONTA · BUSCAR NO CAIXA</span>
                <b className="display" style={{ fontSize: 18 }}>{nomeMesa(c)} · Comanda {c.numero} — levar a conta</b>
                <span className="small muted">Emitida por {c.contaEmitidaPor || 'caixa'} · há {desde(c.contaEmitidaEm, now)}</span>
                <div className="row" style={{ marginTop: 6 }}>
                  <button type="button" className="btn primary sm" onClick={() => act((d) => A.contaEntregue(d, c.id))}>Conta entregue na mesa</button>
                </div>
              </div>
            </div>
          ))}
          {cozinhaEv.map((k) => (
            <div className="toast" role="status" key={'k' + k.chave} style={{ borderColor: k.tipo === 'preparo' ? 'var(--ok)' : 'var(--accent)', background: k.tipo === 'preparo' ? 'var(--ok-soft)' : 'var(--accent-soft)' }}>
              <div className="col grow" style={{ gap: 4 }}>
                <span className={'t ' + (k.tipo === 'preparo' ? 'ok' : 'accent')}>{k.tipo === 'preparo' ? 'COZINHA · EM PREPARO' : 'COZINHA · NOVO PEDIDO' + (k.tablet ? ' PELO TABLET' : '')}</span>
                <b className="display" style={{ fontSize: 18 }}>{nomeMesa(k.c)} · {k.itens.map((i) => i.qtd + '× ' + i.nome).join(', ')}</b>
                <span className="small muted">Comanda {k.c.numero} · garçom {k.c.garcom}{k.tipo === 'preparo' ? ' · a cozinha começou a preparar' : ' · já está na tela da cozinha'}</span>
              </div>
            </div>
          ))}
          {avisosToast.slice(0, 3).map((a) => (
            <div className="toast" role="alert" key={a.id} style={{ borderColor: 'var(--bad)', background: 'var(--bad-soft)' }}>
              <div className="col grow" style={{ gap: 4 }}>
                <span className="t bad">COZINHA CHAMANDO · há {desde(a.ts, now)}</span>
                <b className="display" style={{ fontSize: 18 }}>{nomeMotivo(a.motivo)}{a.comandaNum ? ' · Comanda ' + a.comandaNum : ''}</b>
                {a.texto && <span>{a.texto}</span>}
                <div className="row wrap" style={{ marginTop: 6, gap: 6 }}>
                  <button type="button" className="btn primary sm" onClick={() => act((d) => A.vistoAviso(d, a.id))}>Vi, estou indo</button>
                  <button type="button" className="btn sm" onClick={() => act((d) => A.resolverAviso(d, a.id))}>Resolvido</button>
                </div>
              </div>
            </div>
          ))}
          {bar.slice(0, 3).map(({ c, envio, itens, ts }) => (
            <div className="toast bar" role="status" key={envio}>
              <div className="col grow" style={{ gap: 4 }}>
                <span className="t" style={{ color: 'var(--info-text)' }}>BAR · NOVO PEDIDO{itens.some((i) => i.via === 'tablet') ? ' PELO TABLET' : ''} · há {desde(ts, now)}</span>
                <b className="display" style={{ fontSize: 18 }}>{itens.map((i) => i.qtd + '× ' + i.nome).join(', ')}</b>
                <span className="small muted">{c.mesaId ? (s.mesasSalao.find((m) => m.id === c.mesaId)?.nome + ' · ') : ''}Comanda {c.numero} · garçom {c.garcom}{itens.some((i) => i.obs) ? ' · ' + itens.filter((i) => i.obs).map((i) => i.obs).join(', ') : ''}</span>
                <div className="row" style={{ marginTop: 6 }}>
                  <button type="button" className="btn sm" style={{ background: 'var(--info)', borderColor: 'var(--info)', color: '#fff' }} onClick={() => act((d) => A.barPronto(d, c.id, envio))}>Pronto · avisar o garçom</button>
                </div>
              </div>
            </div>
          ))}
          {bar.length > 3 && <a className="btn sm" href="#" style={{ alignSelf: 'flex-end' }}>+{bar.length - 3} pedidos do bar no dashboard</a>}
          {chamados.slice(0, 4).map((ch) => {
            const mesa = s.mesasSalao.find((m) => m.id === ch.mesaId);
            const cmd = s.comandas.find((c) => c.status === 'aberta' && c.mesaId === ch.mesaId);
            return (
              <div className="toast" role="status" key={ch.id} style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
                <div className="col grow" style={{ gap: 4 }}>
                  <span className="t accent">QR CODE · {mesa?.nome?.toUpperCase()}</span>
                  <b className="display" style={{ fontSize: 18 }}>{ch.motivo === 'pedido' ? 'Pedido do cliente: ' + ch.itens.map((i) => i.qtd + '× ' + (s.produtos.find((p) => p.id === i.produtoId)?.nome || '')).join(', ') : ch.motivo === 'conta' ? 'Pediu a conta' : 'Chamou o garçom'}</b>
                  <span className="small muted">{cmd ? 'Comanda ' + cmd.numero + ' · garçom ' + cmd.garcom : 'Sem comanda aberta (abre uma nova ao lançar)'}</span>
                  <div className="row wrap" style={{ marginTop: 6, gap: 6 }}>
                    {ch.motivo === 'pedido' && <button type="button" className="btn primary sm" onClick={() => act((d) => A.atenderChamado(d, ch.id, { lancar: true }))}>Confirmar e enviar</button>}
                    {ch.motivo === 'conta' && cmd && doBar && <button type="button" className="btn primary sm" onClick={() => { act((d) => A.emitirConta(d, cmd.id)); abrirConta(cmd.id); }}>Emitir conta</button>}
                    <button type="button" className="btn sm" onClick={() => act((d) => A.atenderChamado(d, ch.id))}>{ch.motivo === 'pedido' ? 'Recusar' : 'Atendido'}</button>
                  </div>
                </div>
              </div>
            );
          })}
          {prontos.slice(0, 4).map(({ c, envio, origem, itens }) => (
            <div className="toast ok" role="status" key={envio + origem}>
              <div className="col grow" style={{ gap: 4 }}>
                <span className="t ok">{origem === 'bar' ? 'BAR · PRONTO · BUSCAR NO BALCÃO' : 'COZINHA · PRONTO · BUSCAR NA COZINHA'}</span>
                <b className="display" style={{ fontSize: 18 }}>{c.mesaId ? s.mesasSalao.find((m) => m.id === c.mesaId)?.nome + ' · ' : ''}Comanda {c.numero} — {itens.map((i) => i.qtd + '× ' + i.nome).join(', ')}</b>
                <span className="small muted">Garçom {c.garcom}{c.clienteId ? ' · ' + nomeCliente(s.clientes.find((x) => x.id === c.clienteId)) : ''}</span>
                <div className="row" style={{ marginTop: 6 }}>
                  <button type="button" className="btn success sm" onClick={() => act((d) => A.entregue(d, c.id, envio, origem))}>Entregue na mesa</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const NAV = [
  ['Operação', [['', 'Dashboard'], ['caixa', 'Frente de caixa'], ['salao', 'Mapa do salão'], ['turno', 'Turno e caixa'], ['garcom', 'Garçom (tablet)'], ['cozinha', 'Cozinha'], ['jogos', 'Jogos'], ['parede', 'Telas da parede'], ['qrcodes', 'Mesas e QR Codes']]],
  ['Gestão', [['produtos', 'Produtos e cardápio'], ['estoque', 'Estoque e compras'], ['fornecedores', 'Fornecedores'], ['clientes', 'Clientes e fiado'], ['financeiro', 'Financeiro e notas'], ['relatorio', 'Relatório do dia'], ['usuarios', 'Usuários']]],
];

function Layout({ children }) {
  const { s } = useStore();
  const { usuario, sair } = useOperador();
  const now = useNow(5000);
  const [open, setOpen] = useState(false);
  const rota = useRota();
  const base = rota.split('-')[0];
  useEffect(() => setOpen(false), [rota]);
  const badges = {
    'jogos': s.mesas.filter((m) => estadoMesa(m, now) === 'esgotado').length,
    'caixa': ticketsBar(s).length,
    'estoque': s.alertasEstoque.filter((a) => !a.visto).length,
    'garcom': prontosParaLevar(s, usuario?.papel === 'Garçom' ? usuario.nome : null).length,
    '': ticketsBar(s).length + avisosAbertos(s).filter((a) => a.status === 'aberto').length,
    'cozinha': s.comandas.reduce((a, c) => a + (c.status === 'aberta' ? new Set(c.itens.filter((i) => i.status === 'enviado' || i.status === 'preparo').map((i) => i.envio)).size : 0), 0),
  };
  return (
    <div className="app">
      <div className="mobilebar">
        <div className="row"><Logo size={30} /><b className="display">24 HORAS</b></div>
        <button type="button" className="btn sm" onClick={() => setOpen(!open)} aria-expanded={open}>Menu</button>
      </div>
      <nav className={'side' + (open ? ' open' : '')} aria-label="Menu principal">
        <div className="brand"><Logo /><div><b>24 HORAS</b><span>BAR</span></div></div>
        {NAV.map(([sec, todos]) => [sec, todos.filter(([to]) => podeVer(usuario, to))]).filter(([, items]) => items.length).map(([sec, items]) => (
          <div key={sec} className="col" style={{ gap: 2 }}>
            <div className="navsec">{sec.toUpperCase()}</div>
            {items.map(([to, label]) => (
              <a key={to} href={'#' + to} className={'nav' + (base === to ? ' active' : '')} aria-current={base === to ? 'page' : undefined}>
                {label}{badges[to] ? <span className="badge">{badges[to]}</span> : null}
              </a>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 16 }} className="col">
          <div className="userbox">
            <Avatar u={usuario} tamanho={34} />
            <div className="col grow" style={{ gap: 0, minWidth: 0 }}><b>{usuario.nome}</b><span className="small muted">{usuario.papel}</span></div>
            <button type="button" className="btn sm" onClick={sair}>Trocar</button>
          </div>
          <TemaBtn className="btn sm" />
        </div>
      </nav>
      <div className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
        <Alertas />
        {base !== 'cozinha' && <FaixaEsgotados />}
        <main className="main">{children}</main>
      </div>
    </div>
  );
}

const PAGINAS = { '': Dashboard, caixa: Caixa, garcom: Garcom, cozinha: Cozinha, jogos: Jogos, estoque: Estoque, fornecedores: Fornecedores, clientes: Clientes, financeiro: Financeiro, relatorio: Relatorio, usuarios: Usuarios, qrcodes: QrCodes, produtos: Produtos, salao: Salao, turno: Turno };

function App() {
  const rota = useRota();
  if (rota === 'parede') return <ParedeTodas />;
  if (rota === 'fila') return <ClienteFila />;
  if (rota.startsWith('mesa-')) return <ClienteMesa mesaId={rota.slice(5)} />;
  if (rota.startsWith('parede-')) return <Parede id={rota.slice(7)} />;
  return <Equipe rota={rota} />;
}

// telas da equipe: pedem o PIN e mostram só o que o papel da pessoa pode ver
function Equipe({ rota }) {
  const { usuario, entrar } = useOperador();
  if (!usuario) return <TelaPin onEntrar={entrar} />;
  let base = rota.split('-')[0];
  if (!PAGINAS[base]) base = '';
  if (!podeVer(usuario, base)) base = inicial(usuario);
  const Pagina = PAGINAS[base] || Dashboard;
  return <Layout><Pagina /></Layout>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <OperadorProvider>
        <App />
      </OperadorProvider>
    </StoreProvider>
  </StrictMode>
);
