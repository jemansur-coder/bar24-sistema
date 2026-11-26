# Bar 24 Horas · sistema (protótipo funcional)

Sistema de gestão do Bar 24 Horas: frente de caixa, garçom na maquininha (POS), cozinha (KDS), bar, mapa do salão, tablets fixos nas mesas, jogos (**sinuca por ficha** e cartas por tempo) com telas de parede, estoque com controle anti-furto, fornecedores, clientes e fiado, financeiro/notas, turno de caixa, relatório diário e usuários com PIN. Tema claro e escuro.

Stack: **React 19 + Vite 6**, sem roteador externo (rotas por `#hash`), sem backend: os dados ficam no `localStorage` do navegador.

## Como rodar

Requisitos: Node.js 18 ou mais novo.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ (site estático)
npm run preview    # serve o dist/ em http://localhost:4173
```

Publicar: qualquer hospedagem estática (Vercel detecta Vite sozinho: build `npm run build`, saída `dist`; já existe `vercel.json`).

Primeiro acesso: a tela pede "Quem está usando?" e o PIN. Os usuários e PINs de teste estão em `src/seed.js` (troque antes de usar de verdade). Para voltar aos dados de exemplo: **Usuários → Restaurar dados de exemplo**, ou limpe o `localStorage` (chave `bar24-dados-v1`).

## O que mudou nesta versão

### 1. Sinuca cobrada POR FICHA, com controle separado por mesa (o mais importante)

Sinuca **não é por tempo**. Cada ficha vale uma partida (preço em `config.precoFicha`, padrão R$ 2,00, editável pelo dono/gerente na tela Jogos). Cada mesa de sinuca tem o próprio controle:

| O que o sistema guarda por mesa | Onde |
|---|---|
| Fichas **vendidas**, fichas **usadas** (partidas liberadas) e **saldo** (pagas e ainda não jogadas) | `mesa.sessao.fichas / usadas`, `saldoFichas()` |
| Cada lançamento: quantidade, valor, como foi cobrado (comanda, dinheiro, cartão, Pix), NSU da maquininha, quem lançou | `mesa.sessao.lanc[]` |
| Horário de cada partida (dá o tempo médio por partida e a ocupação) | `mesa.sessao.partidas[]` |
| Sessões encerradas (histórico por mesa) | `s.historicoSinuca[]` |
| Conferência do cofre da mesa (contagem cega) | `s.conferenciasFichas[]` |

Regras:
- **Lançado na conta:** escolhendo "Na comanda", as fichas entram como uma linha `Ficha sinuca · Sinuca N` (quantidade × preço) e as próximas fichas daquela mesa vão para a mesma comanda. Pago na hora, vira um pagamento com `mesaJogoId`.
- **Próxima partida** consome 1 ficha do saldo. Ao vender fichas para uma mesa sem partida, a primeira já começa.
- **Estorno** só do saldo não jogado e só com PIN de gerente/dono, com motivo. Desfaz o lançamento (tira da comanda ou registra devolução) e gera alerta para o dono. A linha da ficha não pode ser cancelada pela comanda, só pelo estorno da mesa.
- **Encerrar a mesa:** o saldo não estornado conta como jogado (o sistema avisa antes) e a sessão vai para o histórico.
- **Conferência do cofre:** o caixa conta as fichas do cofre da mesa sem ver o esperado; o sistema compara com as partidas registradas desde a última conferência. Ficha a mais = partida jogada sem lançamento → alerta.
- **Painel "Controle de fichas por mesa · hoje"** (tela Jogos): vendidas, estornadas, partidas, receita (comanda × na hora), média por partida, saldo agora, cofre, fichas por funcionário e sessões do dia com filtro por mesa. O **relatório do dia** (e o texto de WhatsApp) traz a sinuca por mesa e os alertas.
- **Tela da parede** (`#parede-sinuca-1`): "Ficha 2 de 5", fichas restantes, tempo da partida atual, aviso de última ficha.

Código: regras e cálculos em `src/sinuca.js`; ações em `src/store.jsx` (`A.venderFichas`, `A.novaPartida`, `A.estornarFichas`, `A.vincularComanda`, `A.encerrarJogo`, `A.conferirCofre`); telas em `src/pages/SinucaControle.jsx` (usadas em Jogos e no Garçom).

### 2. Garçom na maquininha (POS Smart Android)
- Tela do garçom (`#garcom`) ajustada para tela pequena (~360 px): cardápio em 3 colunas, barra fixa com total e "Enviar pedido".
- Nova aba **Sinuca** no garçom: liberar partida e vender fichas (na comanda ou cobrando na maquininha).
- **Ponto único de integração de pagamento:** `src/integracoes/pagamento.js` (função `cobrar()`), hoje **simulado**. A empresa da maquininha ainda não foi definida; quando for, só esse arquivo muda (o arquivo explica as opções: SDK Android via app casca/WebView, integração pela nuvem com webhook, Pix por API). O botão `src/integracoes/BotaoPOS.jsx` é usado no caixa e na sinuca, e o NSU fica gravado no pagamento.

### 3. Tablets fixos nas mesas (modo quiosque)
- Cada tablet abre `#mesa-<id>?quiosque=1` (ex.: no Fully Kiosk). Nesse modo some o link para o sistema, a tela volta ao cardápio após 2 min parada e o navegador é mantido aceso (Wake Lock). O endereço de cada mesa aparece em **Mesas e QR Codes**.
- Pedido feito no tablet de mesa com comanda aberta vai direto: pratos para a cozinha, bebidas para o bar (do PR anterior).

### 4. Equipe e PIN
- Gilmar (Dono) e Ingrid (Gerente) cadastrados. Ordem da tela de PIN: **Dono, Gerente, Garçom, Cozinha** (depois Caixa e Estoquista).
- Autorização de gerente reaproveitável: `usePinGestor()` em `src/sessao.jsx`.

### Já existia (PR anterior)
Pedido do tablet direto para cozinha/bar, caixa emite a conta e avisa o garçom, estoque anti-furto, turno de caixa com contagem cega, mapa do salão (trocar/juntar/transferir), fila de jogos por QR, telas de parede.

## Estrutura

```
src/
  main.jsx            layout, menu por papel, alertas/toasts e rotas
  store.jsx           estado global (localStorage) e TODAS as ações (objeto A)
  sinuca.js           regras e relatórios da sinuca por ficha
  seed.js             dados de exemplo, usuários, cardápio, mesas
  sessao.jsx          login por PIN, permissões por papel, usePinGestor
  integracoes/        pagamento.js (maquininha/Pix) e BotaoPOS.jsx
  pages/              uma tela por arquivo (Caixa, Garcom, Jogos, SinucaControle, Parede, Cliente...)
```

## Rotas

Equipe: `#` dashboard · `#caixa` · `#salao` · `#turno` · `#garcom` · `#cozinha` · `#jogos` · `#parede` · `#qrcodes` · `#produtos` · `#estoque` · `#fornecedores` · `#clientes` · `#financeiro` · `#relatorio` · `#usuarios`
Cliente / aparelhos fixos: `#mesa-<id>` (QR e tablet da mesa, `?quiosque=1` no tablet) · `#fila` · `#parede-<mesa>` (TV de cada mesa de jogo, ex.: `#parede-sinuca-1`)

## Para produção (próximos passos)

- **Backend + banco** (ex.: Supabase/Postgres ou API própria) com tempo real entre caixa, cozinha, garçons, tablets e TVs. Hoje cada navegador tem seus dados; a sincronização é só entre abas do mesmo navegador. As ações de `store.jsx` (objeto `A`) são o contrato natural para virar endpoints.
- **Maquininha:** implementar `src/integracoes/pagamento.js` com o SDK da adquirente escolhida.
- **Fiscal:** NFC-e/NF-e (hoje simulado). **Pix** com confirmação automática por webhook.
- **Segurança:** PIN validado no servidor, PINs de teste removidos, log de auditoria no banco.
- **Offline** no app do garçom e impressora térmica (conta e pedidos).
- Relatório noturno automático para o dono (WhatsApp/e-mail).
