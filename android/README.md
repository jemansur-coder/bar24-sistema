# App do garçom para a maquininha Cielo Smart (L300)

App Android que mostra a tela do garçom do sistema (`#garcom`) e usa a maquininha Cielo para **cobrar** e **imprimir**.

## Como funciona

- `MainActivity.java` abre um WebView com o sistema web. Por padrão usa a cópia que vai dentro do APK (`assets/www`, gerada por `npm run build`). Em **⚙ Maquininha → Endereço do sistema** dá para apontar para o sistema publicado na internet.
- A página fala com o app por `window.Android` (veja `src/integracoes/pagamento.js`):
  - `cobrar(json)` → abre `lio://payment?request=<base64>&urlCallback=bar24garcom://response`. A Cielo devolve o resultado em `bar24garcom://response?response=<base64>` e o app chama `window.__retornoPOS(id, resultado)`.
  - `imprimir(texto)` → `lio://print` com `PRINT_TEXT` (botão **Imprimir comanda** no garçom).
  - `configurar()` → tela com Client ID, Access Token, e-mail e **modo teste**.
  - `info()` → `{ adquirente: 'cielo', modoTeste }`.
- **Modo teste** (padrão, ou sem credenciais): a cobrança é aprovada pelo próprio app e nada é cobrado.
- Cartão vai sem `paymentCode`, então a própria Cielo pergunta débito/crédito. Pix vai com `paymentCode: "PIX"` (na Cielo o Pix ainda depende de habilitação).
- Requisitos Cielo Smart atendidos: `minSdk 24`, `targetSdk 29`, `<meta-data android:name="cs_integration_type" android:value="uri" />`.

## Gerar o APK

- **Android Studio**: abra a pasta `android/` e use *Build → Generate Signed App Bundle / APK*. O Gradle roda `npm ci`/`npm run build` na raiz e copia o `dist` para o APK.
- **Linha de comando**: `cd android && ./gradlew assembleDebug` (precisa de Node 20+ e Android SDK).
- **Sem Android SDK (Ubuntu)**: `android/build-apk-sem-android-studio.sh` usa as ferramentas do `apt` (aapt2, dx, apksigner).
- **GitHub**: o workflow `.github/workflows/apk-garcom.yml` gera o APK a cada push (aba *Actions → Artifacts*).

Guarde a chave (keystore) usada para assinar: atualizações precisam da mesma chave.

## Pontos de atenção (Cielo)

1. **Instalação**: maquininha de produção não aceita APK avulso. Para testar: app *Cielo LIO Emulator* num celular Android comum, ou terminal de desenvolvimento pedido à Cielo. Para usar no bar: publicar no Dev Console (cieloliostore.com.br) em **loja privada** e pedir a distribuição para os terminais do estabelecimento.
2. **WebView**: a documentação da Cielo diz que apps com WebView/híbridos são recusados na certificação da Cielo Store. Este app serve para testar o fluxo agora. Para publicar, o caminho seguro é uma tela nativa (Kotlin/Java) que fale com o servidor do sistema, mantendo a mesma integração por deep link deste projeto.
3. **Dados**: o protótipo guarda os dados no aparelho (localStorage). Para a maquininha conversar com caixa/cozinha em tempo real é preciso o servidor/banco da versão final.
4. Credenciais: [Portal de desenvolvedores Cielo](https://desenvolvedores.cielo.com.br/api-portal/myapps) → *Client ID Cadastrados* (Client ID + Access Token).
