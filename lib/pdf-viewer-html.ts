/**
 * HTML do leitor de PDF (PDF.js) carregado dentro da `WebView`.
 *
 * Por que gerar o HTML aqui, e não usar um visualizador pronto: o PDF.js
 * desenha a página no `<canvas>` e, por cima, uma **camada de texto
 * transparente** posicionada com a matriz de cada trecho. É essa camada que
 * permite selecionar/copiar o texto com o dedo — exatamente o que faltava no
 * `react-native-pdf`, que só mostrava a página rasterizada.
 *
 * O arquivo chega em `window.__PDF_DATA__` (data URI base64), injetado pelo app.
 * Assim o PDF.js nunca faz requisição de rede: funciona offline e não esbarra
 * em CORS do servidor da faculdade.
 */

import { PDFJS_BASE_URL } from '@/lib/pdf-source';

export type PdfViewerTheme = {
  background: string;
  border: string;
  ink: string;
  muted: string;
  primary: string;
  surface: string;
};

export type PdfViewerHtmlOptions = {
  /** Endereço público (http/https) para o plano B no Google Docs Viewer. */
  googleUrl?: string | null;
  theme: PdfViewerTheme;
};

function styles(theme: PdfViewerTheme): string {
  return [
    ':root{color-scheme:light dark;}',
    '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}',
    'html,body{margin:0;padding:0;background:',
    theme.background,
    ';color:',
    theme.ink,
    ';font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}',
    'body{display:flex;flex-direction:column;height:100vh;overflow:hidden;}',
    '#bar{display:flex;align-items:center;gap:6px;padding:8px 10px;background:',
    theme.surface,
    ';border-bottom:1px solid ',
    theme.border,
    ';position:sticky;top:0;z-index:5;}',
    '#bar button{border:1px solid ',
    theme.border,
    ';background:transparent;color:',
    theme.ink,
    ';border-radius:9px;font-size:13px;font-weight:600;min-width:34px;height:34px;padding:0 9px;}',
    '#bar button:active{background:',
    theme.primary,
    '22;}',
    '#bar button:disabled{opacity:.35;}',
    '#counter{font-size:12px;font-variant-numeric:tabular-nums;color:',
    theme.muted,
    ';min-width:52px;text-align:center;}',
    '.grow{flex:1;}',
    '#stage{flex:1;overflow:auto;padding:12px;display:block;}',
    '#pageWrap{position:relative;margin:0 auto;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.18);border-radius:6px;}',
    'canvas{display:block;border-radius:6px;}',
    '#textLayer{position:absolute;inset:0;overflow:hidden;}',
    '#textLayer span{position:absolute;color:transparent;white-space:pre;transform-origin:0 0;cursor:text;',
    '-webkit-user-select:text;user-select:text;}',
    '#textLayer span::selection{background:rgba(99,102,241,.45);color:transparent;}',
    '#textLayer span::-moz-selection{background:rgba(99,102,241,.45);}',
    '#raw{flex:1;overflow:auto;padding:14px 16px;}',
    '#rawText{margin:0;white-space:pre-wrap;word-break:break-word;font:14px/1.6 ui-monospace,Menlo,Consolas,monospace;',
    '-webkit-user-select:text;user-select:text;}',
    '#status{position:fixed;left:12px;right:12px;bottom:12px;padding:9px 12px;border-radius:10px;font-size:12px;',
    'background:',
    theme.surface,
    ';border:1px solid ',
    theme.border,
    ';color:',
    theme.muted,
    ';opacity:0;transition:opacity .2s;pointer-events:none;}',
    '#status.on{opacity:1;}',
    '#error{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;',
    'padding:26px;text-align:center;background:',
    theme.background,
    ';}',
    '#error[hidden]{display:none;}',
    '#error h2{margin:0;font-size:16px;}',
    '#error p{margin:0;font-size:13px;line-height:1.5;color:',
    theme.muted,
    ';max-width:420px;}',
    '#error button{border:1px solid ',
    theme.border,
    ';background:',
    theme.primary,
    ';color:#fff;border-radius:10px;font-size:13px;font-weight:700;padding:10px 16px;}',
    '#error button.ghost{background:transparent;color:',
    theme.ink,
    ';}',
    '[hidden]{display:none !important;}',
  ].join('');
}

function body(googleUrl: string | null): string {
  const googleButton = googleUrl
    ? '<button id="google" class="ghost">Abrir no Google Docs</button>'
    : '';
  return [
    '<div id="bar">',
    '<button id="prev" aria-label="Página anterior">‹</button>',
    '<span id="counter">— / —</span>',
    '<button id="next" aria-label="Próxima página">›</button>',
    '<span class="grow"></span>',
    '<button id="zoomOut" aria-label="Diminuir zoom">−</button>',
    '<button id="zoomIn" aria-label="Aumentar zoom">+</button>',
    '<button id="textToggle" aria-label="Alternar texto da página">Texto</button>',
    '<button id="copy" aria-label="Copiar texto">Copiar</button>',
    '</div>',
    '<div id="stage"><div id="pageWrap"><canvas id="canvas"></canvas><div id="textLayer"></div></div></div>',
    '<div id="raw" hidden><pre id="rawText"></pre></div>',
    '<div id="status"></div>',
    '<div id="error" hidden><h2>Não foi possível abrir este PDF</h2><p id="errorText"></p>',
    '<button id="retry">Tentar novamente</button>',
    googleButton,
    '</div>',
  ].join('');
}

/**
 * Script do leitor. Sem template literals nem `${}`: este bloco é concatenado
 * como texto e roda tal e qual dentro do WebView.
 */
function viewerScript(googleUrl: string | null): string {
  const googleLine = googleUrl ? `window.__GOOGLE_URL__ = ${JSON.stringify(googleUrl)};` : 'window.__GOOGLE_URL__ = null;';
  return [
    '<script>',
    `window.__PDFJS_BASE__ = ${JSON.stringify(PDFJS_BASE_URL)};`,
    googleLine,
    'var state = { pdf: null, page: 1, pages: 0, scale: 1, fit: true, text: "", busy: false };',
    'function q(id) { return document.getElementById(id); }',
    'function send(payload) { try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {} }',
    'var statusTimer = null;',
    'function setStatus(message) {',
    '  var node = q("status"); node.textContent = message; node.className = "on";',
    '  if (statusTimer) clearTimeout(statusTimer);',
    '  statusTimer = setTimeout(function () { node.className = ""; }, 2600);',
    '}',
    'function fail(message) {',
    '  q("errorText").textContent = message; q("error").hidden = false;',
    '  send({ type: "error", message: message });',
    '}',
    'function retry() { q("error").hidden = true; openPdf(); }',
    'async function openPdf() {',
    '  var data = window.__PDF_DATA__;',
    '  if (!data) { fail("O arquivo do PDF não chegou ao leitor. Abra o material novamente."); return; }',
    '  if (!window.pdfjsLib) { fail("Não foi possível carregar o leitor PDF.js. Verifique a conexão e tente de novo."); return; }',
    '  try {',
    '    window.pdfjsLib.GlobalWorkerOptions.workerSrc = window.__PDFJS_BASE__ + "pdf.worker.min.js";',
    '    var task = window.pdfjsLib.getDocument({ url: data, isEvalSupported: false });',
    '    state.pdf = await task.promise;',
    '    state.pages = state.pdf.numPages;',
    '    send({ type: "ready", pages: state.pages });',
    '    await render(1);',
    '    extractDocument();',
    '  } catch (error) {',
    '    var detail = error && error.message ? String(error.message) : "arquivo inválido ou protegido";',
    '    fail("O leitor não conseguiu processar este PDF (" + detail + ").");',
    '  }',
    '}',
    'async function readPageText(page) {',
    '  var content = await page.getTextContent();',
    '  var out = "";',
    '  for (var i = 0; i < content.items.length; i++) {',
    '    var item = content.items[i];',
    '    if (typeof item.str !== "string") continue;',
    '    out += item.str;',
    '    out += item.hasEOL ? "\\n" : " ";',
    '  }',
    '  return out.replace(/[ \\t]+\\n/g, "\\n").replace(/[ \\t]{2,}/g, " ").trim();',
    '}',
    'async function buildTextLayer(page, viewport) {',
    '  var layer = q("textLayer");',
    '  layer.innerHTML = "";',
    '  var width = Math.floor(viewport.width); var height = Math.floor(viewport.height);',
    '  layer.style.width = width + "px"; layer.style.height = height + "px";',
    '  var content = await page.getTextContent();',
    '  var fragment = document.createDocumentFragment();',
    '  for (var i = 0; i < content.items.length; i++) {',
    '    var item = content.items[i];',
    '    if (!item.str) continue;',
    '    var tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);',
    '    var fontHeight = Math.hypot(tx[2], tx[3]);',
    '    if (!fontHeight) continue;',
    '    var span = document.createElement("span");',
    '    span.textContent = item.str;',
    '    span.style.left = tx[4] + "px";',
    '    span.style.top = (tx[5] - fontHeight) + "px";',
    '    span.style.fontSize = fontHeight + "px";',
    '    span.style.width = Math.max(1, item.width * viewport.scale) + "px";',
    '    fragment.appendChild(span);',
    '  }',
    '  layer.appendChild(fragment);',
    '}',
    'async function render(target) {',
    '  if (!state.pdf) return;',
    '  if (state.busy) return;',
    '  state.busy = true;',
    '  try {',
    '    state.page = Math.min(Math.max(1, target), state.pages);',
    '    var page = await state.pdf.getPage(state.page);',
    '    var base = page.getViewport({ scale: 1 });',
    '    var available = Math.max(220, q("stage").clientWidth - 24);',
    '    var scale = state.fit ? available / base.width : state.scale;',
    '    scale = Math.min(Math.max(scale, 0.3), 4);',
    '    state.scale = scale;',
    '    var viewport = page.getViewport({ scale: scale });',
    '    var dpr = Math.min(window.devicePixelRatio || 1, 2);',
    '    var canvas = q("canvas");',
    '    canvas.width = Math.floor(viewport.width * dpr);',
    '    canvas.height = Math.floor(viewport.height * dpr);',
    '    canvas.style.width = Math.floor(viewport.width) + "px";',
    '    canvas.style.height = Math.floor(viewport.height) + "px";',
    '    q("pageWrap").style.width = Math.floor(viewport.width) + "px";',
    '    q("pageWrap").style.height = Math.floor(viewport.height) + "px";',
    '    var context = canvas.getContext("2d");',
    '    await page.render({ canvasContext: context, viewport: viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;',
    '    await buildTextLayer(page, viewport);',
    '    state.text = await readPageText(page);',
    '    q("rawText").textContent = state.text;',
    '    q("counter").textContent = state.page + " / " + state.pages;',
    '    q("prev").disabled = state.page <= 1;',
    '    q("next").disabled = state.page >= state.pages;',
    '    send({ type: "page", page: state.page, pages: state.pages, text: state.text });',
    '  } catch (error) {',
    '    setStatus("Não foi possível desenhar esta página.");',
    '  } finally {',
    '    state.busy = false;',
    '  }',
    '}',
    'async function extractDocument() {',
    '  if (!state.pdf) return;',
    '  var limit = Math.min(state.pages, 120);',
    '  var total = "";',
    '  var truncated = state.pages > limit;',
    '  for (var n = 1; n <= limit; n++) {',
    '    try {',
    '      var page = await state.pdf.getPage(n);',
    '      total += (n > 1 ? "\\n\\n" : "") + await readPageText(page);',
    '    } catch (e) {}',
    '    if (total.length > 120000) { total = total.slice(0, 120000); truncated = true; break; }',
    '  }',
    '  send({ type: "document", pages: state.pages, text: total.trim(), truncated: truncated });',
    '}',
    'window.__pdfGoTo = function (page) { state.fit = true; return render(page); };',
    'window.__pdfReady = openPdf;',
    '</script>',
  ].join('\n');
}

function controlsScript(): string {
  return [
    '<script>',
    'function q(id) { return document.getElementById(id); }',
    'q("prev").onclick = function () { render(state.page - 1); };',
    'q("next").onclick = function () { render(state.page + 1); };',
    'q("zoomIn").onclick = function () { state.fit = false; state.scale = Math.min(4, state.scale * 1.25); render(state.page); };',
    'q("zoomOut").onclick = function () { state.fit = false; state.scale = Math.max(0.3, state.scale / 1.25); render(state.page); };',
    'q("retry").onclick = function () { retry(); };',
    'var google = q("google");',
    'if (google) { google.onclick = function () { if (window.__GOOGLE_URL__) send({ type: "external", url: window.__GOOGLE_URL__ }); }; }',
    'q("copy").onclick = function () {',
    '  var selection = window.getSelection ? String(window.getSelection()) : "";',
    '  var text = selection && selection.trim() ? selection.trim() : state.text;',
    '  if (!text) { setStatus("Esta página não tem texto selecionável."); return; }',
    '  send({ type: "copy", text: text });',
    '  setStatus("Texto enviado para a área de transferência.");',
    '};',
    'q("textToggle").onclick = function () {',
    '  var raw = q("raw"); var showText = raw.hidden;',
    '  raw.hidden = !showText;',
    '  q("stage").style.display = showText ? "none" : "block";',
    '  q("textToggle").textContent = showText ? "Página" : "Texto";',
    '};',
    'var startX = 0; var startY = 0;',
    'q("stage").addEventListener("touchstart", function (event) {',
    '  if (!event.touches || !event.touches.length) return;',
    '  startX = event.touches[0].clientX; startY = event.touches[0].clientY;',
    '}, { passive: true });',
    'q("stage").addEventListener("touchend", function (event) {',
    '  var selection = window.getSelection ? String(window.getSelection()).trim() : "";',
    '  if (selection) return;',
    '  if (!event.changedTouches || !event.changedTouches.length) return;',
    '  var dx = event.changedTouches[0].clientX - startX;',
    '  var dy = event.changedTouches[0].clientY - startY;',
    '  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)) return;',
    '  render(state.page + (dx < 0 ? 1 : -1));',
    '}, { passive: true });',
    'document.addEventListener("keydown", function (event) {',
    '  if (event.key === "ArrowRight") render(state.page + 1);',
    '  if (event.key === "ArrowLeft") render(state.page - 1);',
    '});',
    'if (window.__pdfReady) window.__pdfReady();',
    '</script>',
  ].join('\n');
}

/** Documento completo entregue ao WebView (`source={{ html }}`). */
export function buildPdfViewerHtml(options: PdfViewerHtmlOptions): string {
  const googleUrl = options.googleUrl ?? null;
  return [
    '<!DOCTYPE html><html lang="pt-BR"><head>',
    '<meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3"/>',
    '<title>Leitor de PDF</title>',
    '<style>',
    styles(options.theme),
    '</style></head><body>',
    body(googleUrl),
    '<script src="',
    PDFJS_BASE_URL,
    'pdf.min.js"></script>',
    viewerScript(googleUrl),
    controlsScript(),
    '</body></html>',
  ].join('');
}
