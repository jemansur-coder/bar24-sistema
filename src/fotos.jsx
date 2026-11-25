// Fotos dos produtos.
// Enquanto não chegam as fotos reais, cada produto usa uma ilustração desenhada aqui.
// Para usar uma foto real, preencha o campo `foto` do produto (endereço da imagem ou data:image/...).

const FUNDOS = {
  Lanches: ['#3A0E10', '#8A2A22'],
  'Porções': ['#3A2A08', '#7A5310'],
  Pratos: ['#1E2A14', '#3F5A22'],
  Cervejas: ['#2A1A08', '#8A6216'],
  Doses: ['#2A1508', '#5C3010'],
  'Sem álcool': ['#0E1F33', '#1D4F80'],
};

function Pao({ y = 0, top }) {
  return top
    ? <g><path d={`M18 ${48 + y} Q18 ${22 + y} 50 ${22 + y} Q82 ${22 + y} 82 ${48 + y} Z`} fill="#E0A04A" /><path d={`M24 ${44 + y} Q26 ${28 + y} 50 ${27 + y}`} stroke="#F2C27A" strokeWidth="3" fill="none" strokeLinecap="round" />{[30, 42, 55, 66, 48, 37, 60].map((x, k) => <ellipse key={k} cx={x} cy={(k % 2 ? 33 : 38) + y} rx="2" ry="1.1" fill="#FFF3D6" />)}</g>
    : <path d={`M20 ${74 + y} h60 q0 9 -9 9 h-42 q-9 0 -9 -9z`} fill="#D18E3C" />;
}

function Burger({ v }) {
  const carne = v === 'frango' ? '#C98B4B' : v === 'picanha' ? '#7A2E22' : '#5A2D17';
  return (
    <g>
      <Pao y={v === 'duplo' ? -6 : 0} top />
      {(v === 'salada' || v === 'tudo') && <path d="M16 50 q6 -5 12 0 q6 -5 12 0 q6 -5 12 0 q6 -5 12 0 q6 -5 12 0 q6 -5 8 -1 v4 h-68z" fill="#5FB548" />}
      {v === 'salada' && <rect x="24" y="52" width="52" height="5" rx="2" fill="#E2463A" />}
      {v === 'duplo' && <rect x="18" y="47" width="64" height="9" rx="4" fill={carne} stroke="#2A1208" strokeWidth="1" />}
      <rect x="18" y={v === 'duplo' ? 58 : 56} width="64" height="10" rx="4" fill={carne} stroke="#2A1208" strokeWidth="1" />
      <path d={`M22 ${v === 'duplo' ? 61 : 59} h56`} stroke="#fff" strokeOpacity=".18" strokeWidth="1.5" />
      {v !== 'salada' && <path d={`M18 ${v === 'duplo' ? 57 : 55} h64 l-6 7 -8 -5 -9 6 -9 -6 -9 6 -9 -6 -8 5z`} fill="#F7C531" />}
      {(v === 'bacon' || v === 'tudo') && <path d="M22 66 q7 -4 14 0 t14 0 t14 0 t14 0" stroke="#B5462F" strokeWidth="4" fill="none" strokeLinecap="round" />}
      {(v === 'egg' || v === 'tudo') && <g><ellipse cx="50" cy="69" rx="20" ry="4.5" fill="#FFFDF5" /><circle cx="50" cy="69" r="3.6" fill="#F6A623" /></g>}
      <Pao />
    </g>
  );
}

function Fritas() {
  return (
    <g>
      {[30, 37, 44, 51, 58, 65, 34, 48, 62].map((x, k) => <rect key={k} x={x} y={18 + (k % 3) * 5} width="6" height="42" rx="2" fill={k % 2 ? '#F7C948' : '#F2B630'} transform={`rotate(${(k % 5 - 2) * 5} ${x + 3} 60)`} />)}
      <path d="M24 44 h52 l-6 40 h-40z" fill="#D7262E" />
      <path d="M24 44 h52 l-2 8 h-48z" fill="#B71C24" />
      <circle cx="50" cy="66" r="8" fill="#FFC21A" />
      <text x="50" y="69.5" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="Arial, sans-serif" fill="#7A0D13">24</text>
    </g>
  );
}

function Coxinha() {
  const um = (x, y, s = 1) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -22 C 7 -12 16 -2 16 8 C 16 18 8 22 0 22 C -8 22 -16 18 -16 8 C -16 -2 -7 -12 0 -22 Z" fill="#D98A2B" />
      <path d="M0 -22 C 7 -12 16 -2 16 8 C 16 18 8 22 0 22 C -8 22 -16 18 -16 8 C -16 -2 -7 -12 0 -22 Z" fill="url(#gCox)" opacity=".5" />
      {[[-6, 2], [5, 8], [-2, 13], [7, -3], [-8, 12]].map(([a, b], k) => <circle key={k} cx={a} cy={b} r="1.3" fill="#9C5A16" />)}
    </g>
  );
  return (
    <g>
      <defs><radialGradient id="gCox" cx=".35" cy=".35" r=".7"><stop offset="0" stopColor="#FFE3A8" /><stop offset="1" stopColor="#D98A2B" stopOpacity="0" /></radialGradient></defs>
      <ellipse cx="50" cy="82" rx="36" ry="6" fill="#000" opacity=".25" />
      {um(34, 58, 0.9)}{um(66, 58, 0.9)}{um(50, 52, 1.05)}
    </g>
  );
}

function Prato() {
  return (
    <g>
      <ellipse cx="50" cy="56" rx="40" ry="30" fill="#F4F4F5" />
      <ellipse cx="50" cy="56" rx="31" ry="22" fill="#E4E4E7" />
      <ellipse cx="38" cy="50" rx="13" ry="9" fill="#FFFDF5" />
      {[[34, 48], [40, 52], [37, 46], [43, 49]].map(([a, b], k) => <ellipse key={k} cx={a} cy={b} rx="2" ry="1" fill="#EDE7D3" />)}
      <ellipse cx="62" cy="48" rx="11" ry="8" fill="#4A2418" />
      {[[58, 46], [64, 50], [66, 45], [60, 51]].map(([a, b], k) => <circle key={k} cx={a} cy={b} r="1.6" fill="#2C140C" />)}
      <path d="M40 60 q10 -5 22 1 q4 3 0 7 q-12 5 -22 0 q-4 -4 0 -8z" fill="#8A4A24" />
      <path d="M44 62 l14 2" stroke="#6B3517" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="68" cy="62" r="4" fill="#E2463A" /><path d="M64 66 q4 -6 10 -2" stroke="#5FB548" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}

function LongNeck({ vidro, rotulo, texto }) {
  return (
    <g>
      <ellipse cx="50" cy="90" rx="16" ry="3" fill="#000" opacity=".3" />
      <path d="M45 8 h10 v4 h-10z" fill="#C9C9CC" />
      <path d="M46 12 h8 v18 q0 6 6 12 q4 4 4 10 v34 q0 4 -4 4 h-20 q-4 0 -4 -4 v-34 q0 -6 4 -10 q6 -6 6 -12z" fill={vidro} />
      <path d="M41 50 q0 -4 3 -7" stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none" />
      <rect x="40" y="56" width="20" height="18" rx="2" fill={rotulo} />
      <text x="50" y="67.5" textAnchor="middle" fontSize="6" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">{texto}</text>
      <rect x="43" y="22" width="14" height="6" rx="1" fill={rotulo} opacity=".9" />
    </g>
  );
}

function Garrafa600({ rotulo, texto, cor = '#fff' }) {
  return (
    <g>
      <ellipse cx="50" cy="91" rx="18" ry="3" fill="#000" opacity=".3" />
      <rect x="45" y="6" width="10" height="5" rx="1" fill="#C9C9CC" />
      <path d="M46 11 h8 v14 q0 6 7 12 q5 4 5 11 v38 q0 4 -4 4 h-24 q-4 0 -4 -4 v-38 q0 -7 5 -11 q7 -6 7 -12z" fill="#5A2E0E" />
      <path d="M38 52 q0 -5 4 -8" stroke="#fff" strokeOpacity=".3" strokeWidth="2" fill="none" />
      <rect x="36" y="54" width="28" height="22" rx="2" fill={rotulo} />
      <text x="50" y="68" textAnchor="middle" fontSize="6.5" fontWeight="800" fontFamily="Arial, sans-serif" fill={cor}>{texto}</text>
    </g>
  );
}

function Dose({ liquido, rotulo }) {
  return (
    <g>
      <rect x="58" y="10" width="22" height="60" rx="5" fill={liquido} opacity=".55" />
      <rect x="64" y="2" width="10" height="10" rx="2" fill="#2B2B2E" />
      <rect x="60" y="34" width="18" height="16" rx="2" fill={rotulo} />
      <ellipse cx="38" cy="86" rx="16" ry="3" fill="#000" opacity=".3" />
      <path d="M24 44 h28 l-3 40 q0 3 -3 3 h-16 q-3 0 -3 -3z" fill="#fff" fillOpacity=".18" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" />
      <path d="M26 62 h24 l-1.7 22 q0 1.5 -1.5 1.5 h-18.6 q-1.5 0 -1.5 -1.5z" fill={liquido} />
      <ellipse cx="38" cy="62" rx="12" ry="1.6" fill="#fff" opacity=".35" />
    </g>
  );
}

function Lata({ cor, faixa, texto, txtCor = '#fff', mini }) {
  return (
    <g>
      <ellipse cx="50" cy="88" rx="20" ry="4" fill="#000" opacity=".3" />
      <path d="M32 18 q0 -5 5 -6 h26 q5 1 5 6 v64 q0 5 -5 5 h-26 q-5 0 -5 -5z" fill={cor} />
      <ellipse cx="50" cy="15" rx="17" ry="4" fill="#D4D4D8" />
      <ellipse cx="50" cy="15" rx="13" ry="2.6" fill="#A1A1AA" />
      <rect x="32" y="42" width="36" height="14" fill={faixa} />
      <text x="50" y="52" textAnchor="middle" fontSize={mini ? 6 : 7.5} fontWeight="800" fontFamily="Arial, sans-serif" fill={txtCor}>{texto}</text>
      <rect x="36" y="20" width="4" height="60" rx="2" fill="#fff" opacity=".18" />
    </g>
  );
}

function Agua() {
  return (
    <g>
      <ellipse cx="50" cy="90" rx="15" ry="3" fill="#000" opacity=".3" />
      <rect x="44" y="6" width="12" height="7" rx="1.5" fill="#2F7DD1" />
      <path d="M44 13 h12 q0 8 6 12 v58 q0 4 -4 4 h-16 q-4 0 -4 -4 v-58 q6 -4 6 -12z" fill="#CFE8FF" opacity=".85" />
      <path d="M38 52 h24 v28 q0 4 -4 4 h-16 q-4 0 -4 -4z" fill="#7CC0FF" opacity=".6" />
      <rect x="38" y="40" width="24" height="12" fill="#2F7DD1" />
      <text x="50" y="48.5" textAnchor="middle" fontSize="6" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">ÁGUA</text>
    </g>
  );
}

const DESENHOS = {
  'x-tudo': () => <Burger v="tudo" />,
  'x-bacon': () => <Burger v="bacon" />,
  'x-duplo': () => <Burger v="duplo" />,
  'x-egg': () => <Burger v="egg" />,
  'x-frango': () => <Burger v="frango" />,
  'x-salada': () => <Burger v="salada" />,
  'x-picanha': () => <Burger v="picanha" />,
  fritas: () => <Fritas />,
  coxinha: () => <Coxinha />,
  'prato-dia': () => <Prato />,
  heineken: () => <LongNeck vidro="#1E7A3C" rotulo="#0B5A2A" texto="LONG NECK" />,
  original: () => <Garrafa600 rotulo="#F3E2B3" texto="600 ML" cor="#7A1F12" />,
  brahma: () => <Garrafa600 rotulo="#C8102E" texto="600 ML" />,
  'dose-cachaca': () => <Dose liquido="#E8D27A" rotulo="#3F6B2A" />,
  'dose-whisky': () => <Dose liquido="#C4741C" rotulo="#1A1A1A" />,
  'dose-vodka': () => <Dose liquido="#E6F1FA" rotulo="#2E4C8C" />,
  coca: () => <Lata cor="#D7262E" faixa="#FFFFFF" texto="COLA" txtCor="#D7262E" />,
  guarana: () => <Lata cor="#1F8A3C" faixa="#F7C531" texto="GUARANÁ" txtCor="#0E4A20" mini />,
  agua: () => <Agua />,
  redbull: () => <Lata cor="#1F3F8C" faixa="#C0C4CC" texto="ENERGY" txtCor="#C8102E" />,
};

function porCategoria(cat) {
  if (cat === 'Lanches') return <Burger v="salada" />;
  if (cat === 'Porções') return <Fritas />;
  if (cat === 'Pratos') return <Prato />;
  if (cat === 'Cervejas') return <LongNeck vidro="#5A2E0E" rotulo="#FFC21A" texto="CERVEJA" />;
  if (cat === 'Doses') return <Dose liquido="#C4741C" rotulo="#1A1A1A" />;
  return <Lata cor="#52525B" faixa="#FFC21A" texto="BEBIDA" txtCor="#111214" />;
}

export function FotoProduto({ produto, tamanho = 64, raio = 12, style }) {
  if (produto?.foto) {
    return <img src={produto.foto} alt={produto.nome} width={tamanho} height={tamanho} style={{ width: tamanho, height: tamanho, objectFit: 'cover', borderRadius: raio, flex: 'none', ...style }} />;
  }
  const [a, b] = FUNDOS[produto?.cat] || ['#26282D', '#3A3C42'];
  const gid = 'fp-' + (produto?.id || 'x');
  const desenho = DESENHOS[produto?.id] ? DESENHOS[produto.id]() : porCategoria(produto?.cat);
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" role="img" aria-label={'Ilustração: ' + (produto?.nome || 'produto')} style={{ borderRadius: raio, flex: 'none', display: 'block', ...style }}>
      <defs><radialGradient id={gid} cx=".5" cy=".35" r=".8"><stop offset="0" stopColor={b} /><stop offset="1" stopColor={a} /></radialGradient></defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      {desenho}
    </svg>
  );
}
