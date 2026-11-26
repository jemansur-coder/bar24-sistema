package br.com.bar24horas.garcom;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * App do garçom do Bar 24 Horas para a maquininha Cielo Smart (Android).
 *
 * - Mostra a tela do garçom do sistema (#garcom). Por padrão usa a cópia do sistema que vem
 *   dentro do APK (pasta assets/www); em Configurações dá para apontar para o endereço do
 *   sistema na internet (ex.: https://bar24.vercel.app).
 * - A página chama window.Android.cobrar(json) / imprimir(texto). Este app repassa para a Cielo
 *   pela integração "deep link" (lio://payment e lio://print) e devolve o resultado para a
 *   página em window.__retornoPOS(id, json). Ver src/integracoes/pagamento.js.
 * - Sem Client ID / Access Token (ou com "modo teste" ligado) a cobrança é simulada aqui mesmo.
 */
public class MainActivity extends Activity {

    static final String HOST_LOCAL = "app.bar24.local";
    static final String URL_LOCAL = "https://" + HOST_LOCAL + "/index.html";
    static final String CALLBACK = "bar24garcom://response";

    private WebView web;
    private SharedPreferences prefs;
    private final Handler ui = new Handler(Looper.getMainLooper());

    // cobrança aguardando o retorno da Cielo
    private String pendenteId = null;
    private String pendenteTipo = null; // "pagamento" | "impressao"
    private JSONObject pendentePedido = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("bar24", MODE_PRIVATE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        setContentView(web);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setUserAgentString(ws.getUserAgentString() + " Bar24Garcom/0.1");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST_LOCAL.equals(u.getHost())) return null;
                String path = u.getPath();
                if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
                try {
                    InputStream in = getAssets().open("www" + path);
                    return new WebResourceResponse(mime(path), mime(path).startsWith("text") || path.endsWith(".js") ? "utf-8" : null, in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
                }
            }
        });
        web.addJavascriptInterface(new Ponte(), "Android");
        carregar();
        tratarRetorno(getIntent());
    }

    private void carregar() {
        String url = prefs.getString("url", "").trim();
        if (url.isEmpty()) url = URL_LOCAL;
        if (!url.contains("#")) url = url + "#garcom";
        web.loadUrl(url);
    }

    static String mime(String p) {
        p = p.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        tratarRetorno(intent);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        // na raiz não sai do app (a maquininha é do garçom)
    }

    // ---------------------------------------------------------------- credenciais
    private boolean modoTeste() {
        return prefs.getBoolean("modoTeste", true) || prefs.getString("clientId", "").isEmpty()
                || prefs.getString("accessToken", "").isEmpty();
    }

    private static String b64(String s) {
        return Base64.encodeToString(s.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
    }

    // ---------------------------------------------------------------- pagamento
    void cobrar(final JSONObject p) {
        final String id = p.optString("id");
        final double valor = p.optDouble("valor", 0);
        final String metodo = p.optString("metodo", "cartao");
        if (modoTeste()) {
            ui.postDelayed(new Runnable() {
                public void run() {
                    try {
                        JSONObject r = new JSONObject();
                        r.put("aprovado", true);
                        r.put("metodo", metodo);
                        r.put("valor", valor);
                        r.put("nsu", String.valueOf(100000 + (int) (Math.random() * 899999)));
                        r.put("autorizacao", "TESTE");
                        r.put("bandeira", "pix".equals(metodo) ? "PIX" : "TESTE");
                        r.put("mensagem", "Aprovado (modo teste da maquininha, nada foi cobrado)");
                        devolver(id, r);
                    } catch (Exception e) { /* nada */ }
                }
            }, 1500);
            return;
        }
        try {
            long centavos = Math.round(valor * 100);
            String desc = p.optString("descricao", "Bar 24 Horas");
            if (desc.isEmpty()) desc = "Bar 24 Horas";
            String ref = p.optString("referencia", "");

            JSONObject item = new JSONObject();
            item.put("name", desc.length() > 40 ? desc.substring(0, 40) : desc);
            item.put("quantity", 1);
            item.put("sku", ref.isEmpty() ? "comanda" : ref);
            item.put("unitOfMeasure", "unidade");
            item.put("unitPrice", centavos);

            JSONObject req = new JSONObject();
            req.put("accessToken", prefs.getString("accessToken", ""));
            req.put("clientID", prefs.getString("clientId", ""));
            req.put("reference", ref.isEmpty() ? id : ref);
            req.put("email", prefs.getString("email", ""));
            req.put("installments", 0);
            req.put("items", new JSONArray().put(item));
            req.put("value", String.valueOf(centavos));
            // Cartão: sem paymentCode a própria Cielo pergunta débito/crédito na tela.
            if ("pix".equals(metodo)) req.put("paymentCode", "PIX");
            String fixo = prefs.getString("paymentCode", "").trim();
            if (!"pix".equals(metodo) && !fixo.isEmpty()) req.put("paymentCode", fixo);

            pendenteId = id;
            pendenteTipo = "pagamento";
            pendentePedido = p;
            abrirCielo("lio://payment?request=" + b64(req.toString()) + "&urlCallback=" + CALLBACK);
        } catch (ActivityNotFoundException e) {
            falha(id, metodo, valor, "O app de pagamento da Cielo não foi encontrado neste aparelho.");
        } catch (Exception e) {
            falha(id, metodo, valor, "Erro ao chamar a Cielo: " + e.getMessage());
        }
    }

    void imprimir(String texto) {
        if (modoTeste() && !prefs.getBoolean("imprimirNoTeste", true)) {
            toast("Impressão (modo teste): " + texto.length() + " caracteres");
            return;
        }
        try {
            JSONObject req = new JSONObject();
            req.put("operation", "PRINT_TEXT");
            req.put("styles", new JSONArray().put(new JSONObject()));
            req.put("value", new JSONArray().put(texto));
            pendenteTipo = "impressao";
            abrirCielo("lio://print?request=" + b64(req.toString()) + "&urlCallback=" + CALLBACK);
        } catch (ActivityNotFoundException e) {
            toast("Impressora da Cielo não encontrada neste aparelho.");
        } catch (Exception e) {
            toast("Erro ao imprimir: " + e.getMessage());
        }
    }

    private void abrirCielo(String uri) {
        Intent it = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
        it.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(it);
    }

    // retorno: bar24garcom://response?response=<base64 json>&responsecode=0
    private void tratarRetorno(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri u = intent.getData();
        if (!"bar24garcom".equals(u.getScheme())) return;
        String tipo = pendenteTipo;
        String id = pendenteId;
        JSONObject ped = pendentePedido;
        pendenteTipo = null;
        if ("impressao".equals(tipo)) return;
        if (id == null) return;
        pendenteId = null;
        pendentePedido = null;
        String metodo = ped != null ? ped.optString("metodo", "cartao") : "cartao";
        double valor = ped != null ? ped.optDouble("valor", 0) : 0;
        try {
            String resp = u.getQueryParameter("response");
            if (resp == null) { falha(id, metodo, valor, "A Cielo não devolveu resposta."); return; }
            String json = new String(Base64.decode(resp, Base64.DEFAULT), StandardCharsets.UTF_8);
            JSONObject o = new JSONObject(json);
            if (o.has("code") && o.has("reason")) { falha(id, metodo, valor, o.optString("reason")); return; }
            JSONArray pags = o.optJSONArray("payments");
            if (pags == null || pags.length() == 0) { falha(id, metodo, valor, "Pagamento não concluído."); return; }
            JSONObject pg = pags.getJSONObject(pags.length() - 1);
            JSONObject campos = pg.optJSONObject("paymentFields");
            JSONObject r = new JSONObject();
            r.put("aprovado", true);
            r.put("metodo", metodo);
            r.put("valor", valor);
            r.put("nsu", pg.optString("cieloCode", campos != null ? campos.optString("nsu", "") : ""));
            r.put("autorizacao", pg.optString("authCode", ""));
            r.put("bandeira", pg.optString("brand", campos != null ? campos.optString("brand", "") : ""));
            r.put("pedidoCielo", o.optString("id", ""));
            r.put("mensagem", "Aprovado na Cielo");
            devolver(id, r);
        } catch (Exception e) {
            falha(id, metodo, valor, "Resposta da Cielo inválida: " + e.getMessage());
        }
    }

    private void falha(String id, String metodo, double valor, String msg) {
        try {
            JSONObject r = new JSONObject();
            r.put("aprovado", false);
            r.put("metodo", metodo);
            r.put("valor", valor);
            r.put("mensagem", msg);
            devolver(id, r);
        } catch (Exception e) { /* nada */ }
    }

    private void devolver(final String id, final JSONObject r) {
        ui.post(new Runnable() {
            public void run() {
                web.evaluateJavascript("window.__retornoPOS && window.__retornoPOS("
                        + JSONObject.quote(id) + "," + JSONObject.quote(r.toString()) + ")", null);
            }
        });
    }

    private void toast(final String t) {
        ui.post(new Runnable() { public void run() { Toast.makeText(MainActivity.this, t, Toast.LENGTH_LONG).show(); } });
    }

    // ---------------------------------------------------------------- configurações
    void configurar() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        box.setPadding(pad, pad / 2, pad, 0);

        final EditText cid = campo(box, "Client ID (portal Cielo)", prefs.getString("clientId", ""), false);
        final EditText tok = campo(box, "Access Token (portal Cielo)", prefs.getString("accessToken", ""), true);
        final EditText mail = campo(box, "E-mail do estabelecimento", prefs.getString("email", ""), false);
        final EditText url = campo(box, "Endereço do sistema (vazio = cópia dentro do app)", prefs.getString("url", ""), false);
        final CheckBox teste = new CheckBox(this);
        teste.setText("Modo teste (não cobra de verdade)");
        teste.setChecked(prefs.getBoolean("modoTeste", true));
        box.addView(teste);

        new AlertDialog.Builder(this)
                .setTitle("Configurar maquininha")
                .setView(box)
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Salvar", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface d, int w) {
                        String urlAntes = prefs.getString("url", "");
                        prefs.edit()
                                .putString("clientId", cid.getText().toString().trim())
                                .putString("accessToken", tok.getText().toString().trim())
                                .putString("email", mail.getText().toString().trim())
                                .putString("url", url.getText().toString().trim())
                                .putBoolean("modoTeste", teste.isChecked())
                                .apply();
                        toast(modoTeste() ? "Salvo. Modo teste: nada será cobrado." : "Salvo. Cobranças vão para a Cielo.");
                        if (!urlAntes.equals(url.getText().toString().trim())) carregar();
                    }
                })
                .show();
    }

    private EditText campo(LinearLayout box, String rotulo, String valor, boolean senha) {
        TextView t = new TextView(this);
        t.setText(rotulo);
        box.addView(t);
        EditText e = new EditText(this);
        e.setSingleLine(true);
        e.setText(valor);
        if (senha) e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
        box.addView(e);
        return e;
    }

    // ---------------------------------------------------------------- ponte com a página
    class Ponte {
        @JavascriptInterface
        public void cobrar(String json) {
            try {
                final JSONObject p = new JSONObject(json);
                ui.post(new Runnable() { public void run() { MainActivity.this.cobrar(p); } });
            } catch (Exception e) { /* json inválido */ }
        }

        @JavascriptInterface
        public void imprimir(final String texto) {
            ui.post(new Runnable() { public void run() { MainActivity.this.imprimir(texto); } });
        }

        @JavascriptInterface
        public void configurar() {
            ui.post(new Runnable() { public void run() { MainActivity.this.configurar(); } });
        }

        @JavascriptInterface
        public String info() {
            try {
                JSONObject o = new JSONObject();
                o.put("app", "bar24-garcom");
                o.put("versao", "0.1.0");
                o.put("adquirente", "cielo");
                o.put("modoTeste", modoTeste());
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }
    }
}
