import qrcode from 'qrcode-generator';

// QR Code real (pode ser lido pela câmera do celular).
export function QR({ texto, tamanho = 180, claro = '#FFFFFF', escuro = '#111214', titulo }) {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  const n = q.getModuleCount();
  const m = 2; // margem
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + m} ${y + m}h1v1h-1z`;
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${n + m * 2} ${n + m * 2}`} role="img" aria-label={titulo || 'QR Code'} shapeRendering="crispEdges" style={{ borderRadius: 10, flex: 'none' }}>
      <rect width="100%" height="100%" fill={claro} />
      <path d={d} fill={escuro} />
    </svg>
  );
}

// Endereço público do sistema + rota. Na Vercel vira algo como https://bar24horas.vercel.app/#mesa-m5
export function linkPublico(rota) {
  const base = window.location.href.split('#')[0];
  return base + '#' + rota;
}
