import { useEffect, useState } from 'react';

// Roteador mínimo baseado no "#nome" da URL (ex.: #caixa, #parede-sinuca-1).
// Funciona em qualquer hospedagem estática (Vercel, prévia) sem configuração de servidor.
// parâmetros depois de "?" no hash (ex.: #mesa-m5?quiosque=1) não fazem parte da rota
const ler = () => decodeURIComponent((window.location.hash || '').replace(/^#\/?/, '').split('?')[0]);

export function useRota() {
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const on = () => setRota(ler());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return rota;
}

export function ir(nome) {
  window.location.hash = nome ? '#' + nome : '#';
  window.scrollTo(0, 0);
}

export function Link({ to, children, ...props }) {
  return <a href={'#' + to} {...props}>{children}</a>;
}
