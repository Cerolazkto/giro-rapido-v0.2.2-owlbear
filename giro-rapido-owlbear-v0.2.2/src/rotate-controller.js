// Giro Rápido v0.2.2. Roda do mouse via complemento Chrome/Edge e postMessage.
// A SDK não recebe wheel do mapa; a ferramenta também funciona sem complemento.
import { DEFAULT_ANGLE, stepFromMetadata } from './angle.js';

export const TOOL_ID = 'br.dev.girorapido/tool';
export const MODE_ID = 'br.dev.girorapido/mode';
export const STEP_ID = 'br.dev.girorapido/step';
export const SETTINGS_POPOVER_ID = 'br.dev.girorapido/step-popover';

export function normalizedAngle(value) {
  const angle = Number(value) || 0;
  return ((angle % 360) + 360) % 360;
}

export function isRotatableToken(item) {
  // Não permitir que uma ferramenta para tokens arraste mapas, anotações ou itens travados.
  return Boolean(item && item.type === 'IMAGE' && item.layer === 'CHARACTER' && !item.locked);
}

const clonePoint = (point) => ({ x: point.x, y: point.y });

export function buildDragState(item, point) {
  return {
    id: item.id,
    originalPosition: clonePoint(item.position),
    anchor: clonePoint(point),
    currentPoint: clonePoint(point),
    rotation: normalizedAngle(item.rotation),
    live: null,
    closed: false,
  };
}

export function dragPosition(drag) {
  return {
    x: drag.originalPosition.x + drag.currentPoint.x - drag.anchor.x,
    y: drag.originalPosition.y + drag.currentPoint.y - drag.anchor.y,
  };
}

function notice(OBR, message, kind = 'INFO') {
  return OBR.notification.show(message, kind).catch(() => {});
}

export async function installFastRotate(OBR, bridge = { state() {} }) {
  let drag = null;
  let pickedTokenId = null;
  let updateQueue = Promise.resolve();
  let lastAngle = DEFAULT_ANGLE;
  const angleOf = (context) => stepFromMetadata(context?.metadata);

  const advance = (step) => {
    const tokenId = pickedTokenId;
    if (!tokenId) return;
    // Serializar atualizações para manter a ordem dos pressionamentos E.
    updateQueue = updateQueue.catch(() => {}).then(() =>
      OBR.scene.items.updateItems(
        (item) => item.id === tokenId && isRotatableToken(item),
        (items) => {
          for (const item of items) item.rotation = normalizedAngle(item.rotation + step);
        },
      ),
    ).catch((error) => {
      console.error('[Giro Rápido] Falha ao girar token', error);
      notice(OBR, 'Não foi possível girar este token. Confira as permissões.', 'WARNING');
    });
  };

  function drawLive(state) {
    if (!state || state.closed || !state.live) return;
    state.live[0]((item) => {
      item.position = dragPosition(state);
      item.rotation = state.rotation;
    });
  }

  function abandon() {
    if (!drag) return;
    const state = drag;
    drag = null;
    state.closed = true;
    bridge.state(false);
    if (state.live) state.live[1]();
  }

  async function finish(event) {
    const state = drag;
    if (!state) return;
    drag = null;
    bridge.state(false);
    state.currentPoint = clonePoint(event?.pointerPosition || state.currentPoint);
    state.closed = true;
    const finalPosition = dragPosition(state);
    if (!state.dirty && finalPosition.x === state.originalPosition.x && finalPosition.y === state.originalPosition.y) {
      if (state.live) state.live[1]();
      return;
    }
    try {
      // Escrever no estado real para preservar persistência e histórico da cena.
      await OBR.scene.items.updateItems(
        (item) => item.id === state.id && isRotatableToken(item),
        (items) => {
          for (const item of items) {
            item.position = finalPosition;
            item.rotation = state.rotation;
          }
        },
      );
    } catch (error) {
      console.error('[Giro Rápido] Falha ao concluir arraste', error);
      await notice(OBR, 'O token não pôde ser movido. Confira as permissões.', 'ERROR');
    } finally {
      if (state.live) state.live[1]();
    }
  }

  function startHold(context, event) {
    abandon();
    if (!isRotatableToken(event.target) || event.transformer) return null;
    lastAngle = angleOf(context);
    const state = buildDragState(event.target, event.pointerPosition);
    state.dirty = false;
    state.dragged = false;
    pickedTokenId = state.id;
    drag = state;
    bridge.state(true);
    // A prévia já começa no pressionamento: a rodinha funciona mesmo se o
    // usuário não mover o mouse nem um pixel antes de girar.
    Promise.resolve().then(() => OBR.interaction.startItemInteraction(event.target)).then((live) => {
      if (drag !== state || state.closed) {
        live[1]();
        return;
      }
      state.live = live;
      drawLive(state);
    }).catch((error) => {
      console.warn('[Giro Rápido] Prévia indisponível', error);
      // Ainda pode confirmar movimento/rotação ao soltar o mouse.
    });
    return state;
  }

  function rotateHeld(count) {
    if (!Number.isInteger(count) || Math.abs(count) > 3 || count === 0) return;
    if (!drag || drag.closed) return;
    drag.rotation = normalizedAngle(drag.rotation + count * lastAngle);
    drag.dirty = true;
    drawLive(drag);
  }

  await OBR.tool.create({
    id: TOOL_ID,
    icons: [{ icon: '/icon.svg', label: 'Giro Rápido' }],
    defaultMode: MODE_ID,
    defaultMetadata: { angle: DEFAULT_ANGLE },
  });

  await OBR.tool.createMode({
    id: MODE_ID,
    icons: [{ icon: '/icon.svg', label: 'Giro Rápido', filter: { activeTools: [TOOL_ID] } }],
    cursors: [{ cursor: 'grab' }],

    onToolDown(context, event) {
      pickedTokenId = isRotatableToken(event.target) ? event.target.id : null;
      if (pickedTokenId) startHold(context, event);
      else abandon();
    },

    onToolUp(_, event) {
      if (drag && !drag.dragged) void finish(event);
    },

    onToolClick(_, event) {
      pickedTokenId = isRotatableToken(event.target) ? event.target.id : null;
      return true;
    },

    onToolDragStart(context, event) {
      if (!isRotatableToken(event.target) || event.transformer) return;
      if (!drag || drag.id !== event.target.id) startHold(context, event);
      if (drag) drag.dragged = true;
    },

    onToolDragMove(_, event) {
      if (!drag) return;
      drag.currentPoint = clonePoint(event.pointerPosition);
      drag.dirty = true;
      drawLive(drag);
    },

    onToolDragEnd(_, event) {
      void finish(event);
    },

    onToolDragCancel() {
      abandon();
    },

    onDeactivate() {
      abandon();
      pickedTokenId = null;
    },

    onKeyDown(context, event) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      // Q ativa a ferramenta Pointer do Owlbear. Não interceptá-la.
      const clockwise = event.code === 'KeyE' || event.key?.toLowerCase() === 'e';
      if (!clockwise) return;
      lastAngle = angleOf(context);
      const step = (event.shiftKey ? -1 : 1) * lastAngle;
      if (drag && !drag.closed) {
        drag.rotation = normalizedAngle(drag.rotation + step);
        drag.dirty = true;
        drawLive(drag);
      } else {
        advance(step);
      }
    },
  });

  await OBR.tool.createAction({
    id: STEP_ID,
    icons: [{ icon: '/step.svg', label: 'Passo de rotação', filter: { activeTools: [TOOL_ID] } }],
    onClick(_, elementId) {
      // Configuração de passo por usuário: a SDK guarda os metadados da ferramenta
      // localmente. Abre somente quando o jogador clica no ícone de ajuste.
      void OBR.popover.open({
        id: SETTINGS_POPOVER_ID,
        url: '/step-settings.html',
        width: 278,
        height: 238,
        anchorElementId: elementId,
        anchorOrigin: { horizontal: 'CENTER', vertical: 'BOTTOM' },
        transformOrigin: { horizontal: 'CENTER', vertical: 'TOP' },
      }).catch((error) => {
        console.error('[Giro Rápido] Falha ao abrir ajustes', error);
        void notice(OBR, 'Não foi possível abrir os ajustes do Giro Rápido.', 'WARNING');
      });
    },
  });

  return { cancel: abandon, wheel: rotateHeld };
}
