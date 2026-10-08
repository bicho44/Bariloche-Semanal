# Entorno de Desarrollo AI Studio & Manejo de WebSockets (Vite)

## 📌 Contexto
En Google AI Studio (y plataformas similares que ejecutan contenedores detrás de proxies Cloud Run/HTTPS con iframes), las conexiones WebSocket bidireccionales de desarrollo (HMR / Hot Module Replacement) están deshabilitadas o bloqueadas por diseño.

En **Vite 6**, el script inyectado en modo dev (`/@vite/client`) intenta por defecto conectarse mediante `createWebSocketModuleRunnerTransport`. Al no poder establecer el túnel WebSocket, arroja periódicamente en la consola del navegador y en los logs:
`[vite] failed to connect to websocket (Error: WebSocket closed without opened.)`

---

## 🛠️ Regla recomendada para "Instrucciones de Usuario / Custom Instructions"

Para que el asistente de IA Studio lo aplique automáticamente en **todos tus proyectos de aquí en más**, copia y pega este bloque en las **Instrucciones del Usuario / System Prompt / Preferencias globales**:

```markdown
### Regla de Entorno: Supresión de Vite WebSocket / HMR en AI Studio
- En proyectos con Vite/React en AI Studio:
  1. Configurar `server.hmr: false` en `server.ts` o `vite.config.ts`.
  2. En el `<head>` de `index.html`, incluir siempre el shim de WebSocket/HMR silencioso que intercepta `unhandledrejection` de `/@vite/client` y mockea `new WebSocket()` para el protocolo `vite-hmr`, evitando que se generen advertencias de "WebSocket closed without opened" en los logs del entorno.
```

---

## 💻 El Snippet Estándar para `index.html`

Agregar dentro del `<head>` antes de cargar cualquier script:

```html
<script>
  (function() {
    if (typeof window === 'undefined') return;

    // Silenciar unhandled rejections del transportador de Vite
    window.addEventListener('unhandledrejection', function(event) {
      var msg = event && event.reason && (event.reason.message || String(event.reason));
      if (msg && (msg.includes('WebSocket') || msg.includes('vite') || msg.includes('transport'))) {
        event.preventDefault();
      }
    });

    // Silenciar el console.error específico de Vite WebSocket
    var origConsoleError = console.error;
    console.error = function() {
      var firstArg = arguments[0];
      if (typeof firstArg === 'string' && (
        firstArg.includes('[vite] failed to connect to websocket') ||
        firstArg.includes('WebSocket closed without opened')
      )) {
        return;
      }
      origConsoleError.apply(console, arguments);
    };

    // Mock WebSocket para vite-hmr sin romper otras librerías
    var OrigWS = window.WebSocket;
    if (!OrigWS) return;

    function MockHmrSocket(url, protocols) {
      var target = document.createDocumentFragment();
      this.url = url;
      this.protocols = protocols;
      this.readyState = 1; // OPEN
      this.binaryType = 'blob';
      this.bufferedAmount = 0;
      this.protocol = Array.isArray(protocols) ? protocols[0] : (protocols || 'vite-hmr');

      this.addEventListener = function(t, l, o) { target.addEventListener(t, l, o); };
      this.removeEventListener = function(t, l, o) { target.removeEventListener(t, l, o); };
      this.dispatchEvent = function(e) { return target.dispatchEvent(e); };

      var self = this;
      setTimeout(function() {
        self.readyState = 1;
        var ev = new Event('open');
        if (typeof self.onopen === 'function') self.onopen(ev);
        self.dispatchEvent(ev);
      }, 0);

      this.send = function() {};
      this.close = function() { self.readyState = 3; };
    }

    window.WebSocket = function(url, protocols) {
      var urlStr = String(url || '');
      var isViteHmr = urlStr.includes('vite-hmr') ||
                      urlStr.includes('token=') ||
                      (protocols === 'vite-hmr') ||
                      (Array.isArray(protocols) && protocols.includes('vite-hmr'));

      if (isViteHmr) {
        return new MockHmrSocket(url, protocols);
      }
      return new OrigWS(url, protocols);
    };
    window.WebSocket.prototype = OrigWS.prototype;
    window.WebSocket.CONNECTING = 0;
    window.WebSocket.OPEN = 1;
    window.WebSocket.CLOSING = 2;
    window.WebSocket.CLOSED = 3;
  })();
</script>
```
