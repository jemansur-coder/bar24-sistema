import { Link } from '../router.jsx';
import { brl, estadoMesa, hora, mmss, relogioMesa, tipoJogo, useNow, useStore } from '../store.jsx';
import { Logo } from '../ui.jsx';
import { QR, linkPublico } from '../qr.jsx';

function FilaFaixa({ tipo }) {
  const { s } = useStore();
  const fila = s.fila.filter((f) => !tipo || f.tipo === tipo).sort((a, b) => a.ts - b.ts);
  return (
    <div className="row" style={{ gap: 24, background: 'rgba(255,255,255,.06)', borderRadius: 20, padding: 20, alignItems: 'center' }}>
      <QR texto={linkPublico('fila')} tamanho={120} titulo="QR Code para entrar na fila" />
      <div className="col" style={{ gap: 6 }}>
        <b className="display" style={{ fontSize: 'clamp(20px, 2.2vw, 30px)' }}>Quer jogar? Entre na fila pelo QR Code</b>
        <span style={{ fontSize: 'clamp(16px, 1.8vw, 24px)', color: '#D4D4D8' }}>{fila.length ? 'Próximos: ' + fila.slice(0, 4).map((f, k) => (k + 1) + 'º ' + f.nome).join(' · ') : 'Fila vazia: é só chegar!'}</span>
      </div>
    </div>
  );
}

// Tela para TV/tablet na parede de cada mesa. Abrir em tela cheia (F11) no aparelho da parede.
export function Parede({ id }) {
  const { s } = useStore();
  const now = useNow(250);
  const m = s.mesas.find((x) => x.id === id);
  if (!m) return <div className="wall"><h1>Mesa não encontrada</h1><Link to="parede">Ver todas</Link></div>;
  const e = estadoMesa(m, now, s.config.avisoMin);
  const se = m.sessao;
  const total = se ? se.fim - se.inicio : 1;
  const rest = se ? Math.max(0, se.fim - now) : 0;
  const frac = se ? rest / total : 0;
  const C = 2 * Math.PI * 88;
  const cor = e === 'esgotado' ? '#FF5A5F' : e === 'acabando' ? '#FFC21A' : '#34C77B';
  const chamado = !se && s.fila.find((f) => f.status === 'chamado' && f.mesaJogoId === m.id);
  if (se?.jogo === 'ficha') return <ParedeFicha m={m} now={now} />;
  const titulo = chamado ? 'Sua vez, ' + chamado.nome + '!' : { livre: 'Mesa livre', jogo: 'Bom jogo!', acabando: 'Faltam poucos minutos', esgotado: 'TEMPO ESGOTADO' }[e];
  const sub = chamado ? 'A mesa está liberada para você. Confirme com o caixa para começar.' : { livre: 'Fale com o caixa para começar uma partida.', jogo: 'O cronômetro mostra quanto tempo ainda resta nesta mesa.', acabando: 'Quer mais tempo? Peça ao caixa antes de acabar.', esgotado: 'Procure o caixa para renovar ou liberar a mesa.' }[e];
  return (
    <div className={'wall ' + e} style={e === 'livre' ? { background: '#111214' } : undefined}>
      <header className="row between wrap">
        <div className="row" style={{ gap: 20 }}><Logo size={64} /><span className="display" style={{ fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 700 }}>{m.nome.toUpperCase()}</span></div>
        {se && <span style={{ fontSize: 'clamp(18px, 2.4vw, 32px)', color: '#D4D4D8' }}>{tipoJogo(se.jogo).nome} · {se.jogadores} jogador(es)</span>}
      </header>
      <div className="center">
        <svg viewBox="0 0 200 200" style={{ width: 'min(42vw, 60vh)', minWidth: 240 }} role="img" aria-label={'Tempo restante ' + mmss(rest)}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="#2A2C31" strokeWidth="12" />
          {se && <circle cx="100" cy="100" r="88" fill="none" stroke={cor} strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 100 100)" />}
          <text x="100" y="96" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize={rest >= 3600000 ? 36 : 44} fill="#F4F4F5">{se ? mmss(rest) : '--:--'}</text>
          <text x="100" y="126" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="11" fill="#D4D4D8" letterSpacing="3">{e === 'esgotado' ? 'TEMPO ESGOTADO' : 'TEMPO RESTANTE'}</text>
        </svg>
        <div className="col" style={{ maxWidth: 640, gap: 20 }}>
          <span className="display" style={{ fontSize: 'clamp(40px, 6vw, 84px)', fontWeight: 700, lineHeight: 1.05, color: chamado ? '#4ADE80' : e === 'acabando' ? '#FFC21A' : '#fff' }}>{titulo}</span>
          <span style={{ fontSize: 'clamp(20px, 2.6vw, 36px)', color: '#D4D4D8', lineHeight: 1.35 }}>{sub}</span>
        </div>
      </div>
      {(e === 'acabando' || e === 'esgotado' || e === 'livre' || s.fila.some((f) => f.tipo === m.tipo)) && <FilaFaixa tipo={m.tipo} />}
      <footer className="row between wrap" style={{ fontSize: 'clamp(16px, 2vw, 26px)', color: '#A1A1AA' }}>
        <span>{se ? `Início ${hora(se.inicio)} · Fim ${hora(se.fim)}` : ''}</span>
        <span>{s.config.nomeBar} · <Link to="jogos" style={{ color: '#71717A' }}>sair</Link></span>
      </footer>
    </div>
  );
}

// Sinuca por ficha: mostra a ficha (partida) atual, o tempo da partida e quanto a mesa já jogou.
function ParedeFicha({ m, now }) {
  const { s } = useStore();
  const se = m.sessao; const t = tipoJogo('ficha');
  const novaFicha = now - (se.fichaEm || se.inicio) < 6000;
  return (
    <div className="wall jogo">
      <header className="row between wrap">
        <div className="row" style={{ gap: 20 }}><Logo size={64} /><span className="display" style={{ fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 700 }}>{m.nome.toUpperCase()}</span></div>
        <span style={{ fontSize: 'clamp(18px, 2.4vw, 32px)', color: '#D4D4D8' }}>Sinuca por ficha · {brl(t.preco)} a ficha</span>
      </header>
      <div className="center">
        <div className="col" style={{ alignItems: 'center', gap: 4, minWidth: 260, padding: '28px 40px', borderRadius: 32, border: '6px solid ' + (novaFicha ? '#FFC21A' : '#34C77B'), background: novaFicha ? 'rgba(255,194,26,.12)' : 'rgba(52,199,123,.08)', transition: 'all .4s' }}>
          <span style={{ fontSize: 'clamp(16px, 2vw, 26px)', letterSpacing: 4, color: '#D4D4D8', fontWeight: 600 }}>FICHA</span>
          <span className="display num" style={{ fontSize: 'clamp(110px, 16vw, 220px)', fontWeight: 700, lineHeight: 1 }}>{se.fichas}</span>
          <span style={{ fontSize: 'clamp(16px, 2vw, 24px)', color: '#D4D4D8' }}>partida em andamento</span>
        </div>
        <div className="col" style={{ maxWidth: 640, gap: 20 }}>
          <span className="display" style={{ fontSize: 'clamp(40px, 6vw, 84px)', fontWeight: 700, lineHeight: 1.05, color: novaFicha ? '#FFC21A' : '#fff' }}>{novaFicha ? 'Nova ficha lançada!' : 'Bom jogo!'}</span>
          <span style={{ fontSize: 'clamp(20px, 2.6vw, 36px)', color: '#D4D4D8', lineHeight: 1.35 }}>Partida atual: <b className="num" style={{ color: '#fff' }}>{mmss(now - (se.fichaEm || se.inicio))}</b><br />Fichas desta mesa: <b style={{ color: '#fff' }}>{se.fichas} · {brl(se.valor)}</b></span>
          <span style={{ fontSize: 'clamp(16px, 2vw, 26px)', color: '#A1A1AA' }}>Acabou a partida? Peça a próxima ficha ao garçom ou no caixa.</span>
        </div>
      </div>
      {s.fila.some((f) => f.tipo === m.tipo) && <FilaFaixa tipo={m.tipo} />}
      <footer className="row between wrap" style={{ fontSize: 'clamp(16px, 2vw, 26px)', color: '#A1A1AA' }}>
        <span>Mesa aberta às {hora(se.inicio)}</span>
        <span>{s.config.nomeBar} · <Link to="jogos" style={{ color: '#71717A' }}>sair</Link></span>
      </footer>
    </div>
  );
}

// Uma TV com todas as mesas.
export function ParedeTodas() {
  const { s } = useStore();
  const now = useNow(500);
  return (
    <div className="wallgrid">
      <div style={{ gridColumn: '1 / -1' }} className="row between"><span className="display" style={{ fontSize: 28, fontWeight: 700 }}>Mesas de jogo</span><Link to="jogos" style={{ color: '#A1A1AA' }}>Voltar ao sistema</Link></div>
      {s.mesas.map((m) => {
        const e = estadoMesa(m, now, s.config.avisoMin);
        const se = m.sessao;
        const bg = { livre: '#17181B', jogo: '#13261C', acabando: '#2A2108', esgotado: '#5A0F14' }[e];
        const bd = { livre: '#34363C', jogo: '#1F7A4D', acabando: '#FFC21A', esgotado: '#FF5A5F' }[e];
        return (
          <Link key={m.id} to={'parede-' + m.id} style={{ background: bg, border: '3px solid ' + bd, borderRadius: 20, padding: 24, color: '#fff', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, animation: e === 'esgotado' ? 'pisca 1s infinite' : undefined }}>
            <span className="display" style={{ fontSize: 30, fontWeight: 700 }}>{m.nome}</span>
            <span className="display num" style={{ fontSize: 72, fontWeight: 700 }}>{se ? relogioMesa(m, now) : 'LIVRE'}</span>
            <span style={{ fontSize: 20, color: '#D4D4D8' }}>{!se && s.fila.find((f) => f.status === 'chamado' && f.mesaJogoId === m.id) ? 'Próximo: ' + s.fila.find((f) => f.status === 'chamado' && f.mesaJogoId === m.id).nome + ', é a sua vez!' : se ? (e === 'esgotado' ? 'Tempo esgotado · procure o caixa' : se.jogo === 'ficha' ? 'Sinuca · partida há ' + mmss(now - (se.fichaEm || se.inicio)) : tipoJogo(se.jogo).nome + ' · ' + se.jogadores + ' jogador(es)') : 'Disponível'}</span>
          </Link>
        );
      })}
      <div style={{ gridColumn: '1 / -1' }}><FilaFaixa /></div>
    </div>
  );
}
