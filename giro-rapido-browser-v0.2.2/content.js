/* Giro Rápido v0.2.0: companheiro de navegador para Owlbear Rodeo.
   Sem permissões extras, sem solicitações de rede, sem coleta de dados.
   Captura wheel SOMENTE após uma mensagem enviada pela ferramenta Giro Rápido
   indicando que o botão esquerdo está segurando um token editável. */
(() => {
  'use strict';
  const CHANNEL = 'br.dev.girorapido/wheel-v1';
  let activeFrame = null;
  let frameOrigin = '';
  let activeUntil = 0;
  let leftPressed = false;
  let residue = 0;
  let lastWheelAt = 0;

  function bridgeFrameOf(source, origin) {
    // A consulta ao DOM (e não à página do iframe) não viola same-origin.
    for (const frame of document.querySelectorAll('iframe')) {
      if (frame.contentWindow !== source) continue;
      try {
        const url = new URL(frame.src, document.baseURI);
        if (url.searchParams.get('giroBridge') !== '1') continue;
        if (!url.pathname.endsWith('/background.html')) continue;
        if (origin !== url.origin && origin !== 'null') continue;
        return {frame, origin: origin === 'null' ? '*' : url.origin};
      } catch { /* iframe desconhecido */ }
    }
    return null;
  }

  function release() {
    activeFrame = null;
    frameOrigin = '';
    activeUntil = 0;
    residue = 0;
  }

  window.addEventListener('pointerdown', (event) => {
    if (event.button === 0) leftPressed = true;
  }, true);
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) {
      leftPressed = false;
      release();
    }
  }, true);
  window.addEventListener('pointercancel', () => {
    leftPressed = false;
    release();
  }, true);
  window.addEventListener('blur', () => {
    leftPressed = false;
    release();
  });
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.kind !== 'state') return;
    if (typeof data.active !== 'boolean') return;
    const known = bridgeFrameOf(event.source, event.origin);
    if (!known) return;
    if (!data.active) {
      if (known.frame === activeFrame) release();
      return;
    }
    // Não iniciar captura se o botão do mouse já foi solto antes da mensagem.
    if (!leftPressed) return;
    activeFrame = known.frame;
    frameOrigin = known.origin;
    activeUntil = Date.now() + 60000;
    residue = 0;
  });

  window.addEventListener('wheel', (event) => {
    if (!activeFrame || !leftPressed || Date.now() > activeUntil || !activeFrame.isConnected) {
      release();
      return;
    }
    // Não interferir no zoom especial do navegador (Ctrl + roda).
    if (event.ctrlKey || !event.cancelable) return;
    // Interceptar zoom do mapa apenas durante a rotação do token.
    event.preventDefault();
    event.stopImmediatePropagation();

    const now = Date.now();
    if (now - lastWheelAt > 200 || Math.sign(residue) !== Math.sign(event.deltaY)) residue = 0;
    lastWheelAt = now;
    const pixelDelta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
    if (pixelDelta === 0) return;

    // Scroll físico costuma chegar em pulsos de ~100px; trackpad tem passos
    // menores. Um pulso = um incremento, sem girar várias vezes à toa.
    let count;
    if (Math.abs(pixelDelta) >= 55) {
      count = Math.sign(pixelDelta) * Math.min(3, Math.max(1, Math.round(Math.abs(pixelDelta) / 100)));
      residue = 0;
    } else {
      residue += pixelDelta;
      count = Math.trunc(residue / 30);
      if (count) residue -= count * 30;
    }
    if (!count) return;
    if (!activeFrame.contentWindow) {
      release();
      return;
    }
    // count positivo = rodinha para baixo (anti-horário);
    // count negativo = para cima (horário). O iframe trata o sinal.
    activeFrame.contentWindow.postMessage({ channel: CHANNEL, kind: 'wheel', count: -count }, frameOrigin);
  }, { capture: true, passive: false });
})();
