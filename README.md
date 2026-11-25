# Bar 24 Horas — sistema (protótipo funcional)

Portal de gestão do Bar 24 Horas: frente de caixa, garçom (tablet), cozinha (KDS), jogos com cronômetro e tela da parede, estoque inteligente, fornecedores, clientes e fiado, financeiro/notas, relatório diário e usuários. Tema claro e escuro (botão no menu).

## Rodar no computador

```bash
npm install
npm run dev      # abre em http://localhost:5173
```

## Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel: **Add New → Project → Import** o repositório. O framework é detectado como **Vite** (build `npm run build`, saída `dist`).
3. Deploy. Cada push no GitHub gera uma nova versão.

## Como funciona hoje (protótipo)

- Os dados ficam salvos **no navegador** (localStorage) e sincronizam entre abas do mesmo navegador. Ex.: abra `#parede-sinuca-1` numa aba e o caixa em outra.
- Dados de exemplo podem ser restaurados em **Usuários → Restaurar dados de exemplo**.
- Notas fiscais, Pix e maquininha estão **simulados**.

## Próximos passos para produção

- Banco de dados + API (ex.: Supabase/Postgres) e tempo real entre caixa, cozinha, garçons e telas.
- Login por PIN com permissões por papel.
- Integrações: maquininha (TEF/POS), Pix com confirmação automática, API fiscal NFC-e/NF-e, WhatsApp para o relatório diário.
- App do garçom com modo offline.

## Rotas

`#mesa-<id>` (cliente, pelo QR da mesa) · `#fila` (cliente, fila de jogos) · `#qrcodes` · `#` dashboard · `#caixa` · `#garcom` · `#cozinha` · `#jogos` · `#parede` (todas as mesas) · `#parede-<mesa>` (ex.: `#parede-sinuca-1`) · `#estoque` · `#fornecedores` · `#clientes` · `#financeiro` · `#relatorio` · `#usuarios`
