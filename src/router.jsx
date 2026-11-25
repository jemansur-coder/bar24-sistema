import { useEffect, useState } from 'react';

// Roteador mínimo baseado no "#nome" da URL (ex.: #caixa, #parede-sinuca-1).
// Funciona em qualquer hospedagem estática (Vercel, prévia) sem configuração de servidor.
const ler = () => decodeURIComponent((window.location.hash || '').replace(/^#\/?/, ''));

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
