// Ponte de mensagens do complemento Chrome/Edge para a ferramenta no Owlbear.
// O complemento atua apenas no navegador; este módulo só aceita mensagens do
// documento pai hospedado pelo Owlbear, que a SDK disponibiliza ao iframe.
export const WHEEL_CHANNEL = 'br.dev.girorapido/wheel-v1';
export const OWLBEAR_ORIGINS = new Set([
  'https://www.owlbear.rodeo',
  'https://owlbear.rodeo',
]);

export function validWheelMessage(event, parentWindow) {
  const data = event && event.data;
  return Boolean(
    event &&
    OWLBEAR_ORIGINS.has(event.origin) &&
    event.source === parentWindow &&
    data && data.channel === WHEEL_CHANNEL &&
    data.kind === 'wheel' &&
    Number.isInteger(data.count) &&
    data.count >= -3 && data.count <= 3 && data.count !== 0
  );
}

export function createWheelBridge(win, onWheel) {
  if (!win || win.parent === win) {
    return { state() {}, dispose() {}, enabled: false };
  }
  // Só permite notificações ao host oficial do Owlbear.
  let targetOrigin = '';
  try {
    targetOrigin = new URL(win.document.referrer).origin;
  } catch { /* sem referrer — não habilitar transmissão */ }
  // O Owlbear pode ocultar o referrer do iframe. Nesse caso, enviar apenas
  // um booleano (sem dados privados) ao pai; ao receber, validar a origem.
  const enabled = win.parent !== win;
  const listener = (event) => {
    if (enabled && validWheelMessage(event, win.parent)) onWheel(event.data.count);
  };
  if (enabled) win.addEventListener('message', listener);
  return {
    enabled,
    state(active) {
      if (!enabled) return;
      win.parent.postMessage({ channel: WHEEL_CHANNEL, kind: 'state', active: Boolean(active) }, OWLBEAR_ORIGINS.has(targetOrigin) ? targetOrigin : "*");
    },
    dispose() {
      if (enabled) win.removeEventListener('message', listener);
    },
  };
}
