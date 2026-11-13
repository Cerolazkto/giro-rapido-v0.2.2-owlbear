import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDragState,
  dragPosition,
  installFastRotate,
  isRotatableToken,
  normalizedAngle,
  STEP_ID,
  SETTINGS_POPOVER_ID,
  TOOL_ID,
} from '../src/rotate-controller.js';

function mock() {
  let mode;
  let action;
  const changes = [];
  const notifications = [];
  const token = {
    id: 'token-1', name: 'Heroína', type: 'IMAGE', layer: 'CHARACTER',
    locked: false, position: { x: 100, y: 80 }, rotation: 350,
  };
  const map = {
    id: 'map-1', name: 'Mapa', type: 'IMAGE', layer: 'MAP',
    locked: false, position: { x: 0, y: 0 }, rotation: 0,
  };
  const items = [token, map];
  let interaction;
  const OBR = {
    popover: {
      async open(input) { changes.push(['popover', input]); },
    },
    tool: {
      async create(input) { changes.push(['create', input]); },
      async createMode(input) { mode = input; },
      async createAction(input) { action = input; },
      async setMetadata(id, value) { changes.push(['metadata', id, value]); },
    },
    interaction: {
      async startItemInteraction(input) {
        const preview = structuredClone(input);
        interaction = {
          preview,
          updates: 0,
          stopped: false,
        };
        return [
          (callback) => {
            callback(preview);
            interaction.updates += 1;
            return preview;
          },
          () => { interaction.stopped = true; },
        ];
      },
    },
    scene: {
      items: {
        async updateItems(filter, callback) {
          const targets = items.filter(filter);
          callback(targets);
          changes.push(['items', targets.map((item) => structuredClone(item))]);
        },
      },
    },
    notification: {
      async show(message, variant) { notifications.push([message, variant]); return 'id'; },
    },
  };
  return {
    OBR, token, map, changes, notifications,
    get mode() { return mode; },
    get action() { return action; },
    get interaction() { return interaction; },
  };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('Ângulos são normalizados para 0 a 359 graus', () => {
  assert.equal(normalizedAngle(-30), 330);
  assert.equal(normalizedAngle(375), 15);
  assert.equal(normalizedAngle(720), 0);
});

test('Filtro protege mapas e tokens bloqueados', () => {
  const fixture = mock();
  assert.equal(isRotatableToken(fixture.token), true);
  assert.equal(isRotatableToken(fixture.map), false);
  assert.equal(isRotatableToken({ ...fixture.token, locked: true }), false);
});

test('Arraste usa deslocamento relativo sem saltar de posição', () => {
  const item = mock().token;
  const drag = buildDragState(item, { x: 15, y: 20 });
  drag.currentPoint = { x: 40, y: 45 };
  assert.deepEqual(dragPosition(drag), { x: 125, y: 105 });
  assert.deepEqual(item.position, { x: 100, y: 80 });
});

test('Modo e botão de ajuste são registrados', async () => {
  const f = mock();
  await installFastRotate(f.OBR);
  assert.equal(f.changes[0][0], 'create');
  assert.equal(f.changes[0][1].id, TOOL_ID);
  assert.ok(f.mode.onKeyDown);
  assert.equal(f.action.id, STEP_ID);
});

test('Arrastar e apertar E mantém movimento e grava rotação no item original', async () => {
  const f = mock();
  await installFastRotate(f.OBR);
  await f.mode.onToolDragStart({}, { target: f.token, pointerPosition: { x: 10, y: 10 } });
  f.mode.onToolDragMove({}, { pointerPosition: { x: 30, y: 60 } });
  await tick();
  f.mode.onKeyDown({ metadata: { angle: 15 } }, { code: 'KeyE' });
  assert.equal(f.interaction.preview.rotation, 5);
  assert.deepEqual(f.interaction.preview.position, { x: 120, y: 130 });
  f.mode.onToolDragEnd({}, { pointerPosition: { x: 30, y: 60 } });
  await tick();
  assert.equal(f.token.rotation, 5);
  assert.deepEqual(f.token.position, { x: 120, y: 130 });
  assert.equal(f.interaction.stopped, true);
});

test('Shift+E gira no sentido contrário; cancelar não persiste mudança', async () => {
  const f = mock();
  await installFastRotate(f.OBR);
  await f.mode.onToolDragStart({}, { target: f.token, pointerPosition: { x: 0, y: 0 } });
  await tick();
  f.mode.onKeyDown({ metadata: { angle: 45 } }, { code: 'KeyE', shiftKey: true });
  assert.equal(f.interaction.preview.rotation, 305);
  f.mode.onToolDragCancel();
  assert.equal(f.token.rotation, 350);
  assert.equal(f.interaction.stopped, true);
});

test('E / Shift+E sobre token clicado gira sem arrastar e preserva mapa', async () => {
  const f = mock();
  await installFastRotate(f.OBR);
  f.mode.onToolClick({}, { target: f.token });
  f.mode.onKeyDown({ metadata: { angle: 45 } }, { code: 'KeyE' });
  f.mode.onKeyDown({ metadata: { angle: 45 } }, { code: 'KeyE', shiftKey: true });
  await tick(); await tick();
  assert.equal(f.token.rotation, 350);
  assert.equal(f.map.rotation, 0);
});

test('Não altera mapa, token travado, Q (Pointer) ou teclas com ctrl', async () => {
  const f = mock();
  await installFastRotate(f.OBR);
  await f.mode.onToolDragStart({}, { target: f.map, pointerPosition: { x: 1, y: 1 } });
  f.mode.onToolDragMove({}, { pointerPosition: { x: 200, y: 200 } });
  f.mode.onToolDragEnd({}, { pointerPosition: { x: 200, y: 200 } });
  f.mode.onToolClick({}, { target: f.token });
  f.mode.onKeyDown({ metadata: { angle: 45 } }, { code: 'KeyE', ctrlKey: true });
  f.mode.onKeyDown({ metadata: { angle: 45 } }, { code: 'KeyQ' });
  await tick();
  assert.equal(f.token.rotation, 350);
  assert.equal(f.map.rotation, 0);
});

test('Botão de ângulo abre configuração sem alterar o passo', async () => {
  const f = mock();
  await installFastRotate(f.OBR);
  f.action.onClick({ metadata: { angle: 15 } }, 'elem-88');
  await tick();
  const [kind, config] = f.changes.at(-1);
  assert.equal(kind, 'popover');
  assert.equal(config.id, SETTINGS_POPOVER_ID);
  assert.equal(config.url, '/step-settings.html');
  assert.equal(config.anchorElementId, 'elem-88');
  assert.equal(f.changes.filter(([kind])=>kind==='metadata').length, 0);
});

test('Rótulo principal é só Giro Rápido, sem texto de instruções', async () => {
  const f = mock();
  await installFastRotate(f.OBR);
  assert.equal(f.changes[0][1].icons[0].label, 'Giro Rápido');
  assert.equal(f.mode.icons[0].label, 'Giro Rápido');
  assert.equal(f.changes[0][1].defaultMetadata.angle, 15);
});

test('Passo personalizado também serve para a rotação com a rodinha', async () => {
  const f = mock();
  const instance = await installFastRotate(f.OBR);
  f.mode.onToolDown({metadata:{angle:22.5}}, {target:f.token,pointerPosition:{x:4,y:6}});
  await tick();
  instance.wheel(2);
  assert.equal(f.interaction.preview.rotation, 35); // 350 + 45 = 395 => 35
  f.mode.onToolUp({}, {pointerPosition:{x:4,y:6}});
  await tick();
  assert.equal(f.token.rotation, 35);
});


test('Roda do mouse gira durante token segurado e grava ao soltar', async () => {
  const f = mock();
  const changes = [];
  const instance = await installFastRotate(f.OBR, { state: (active) => changes.push(active) });
  f.mode.onToolDown({ metadata: { angle: 15 } }, { target: f.token, pointerPosition: { x: 3, y: 7 } });
  await tick();
  instance.wheel(1);
  instance.wheel(1);
  assert.equal(f.interaction.preview.rotation, 20);
  f.mode.onToolUp({}, { pointerPosition: { x: 3, y: 7 } });
  await tick();
  assert.equal(f.token.rotation, 20);
  assert.deepEqual(changes, [true, false]);
  assert.equal(f.interaction.stopped, true);
});

test('Roda sobre mapa ou fora de token segurado não faz nada', async () => {
  const f = mock();
  const instance = await installFastRotate(f.OBR);
  instance.wheel(2);
  f.mode.onToolDown({ metadata: { angle: 15 } }, { target: f.map, pointerPosition: { x: 0, y: 0 } });
  instance.wheel(-2);
  await tick();
  assert.equal(f.token.rotation, 350);
  assert.equal(f.map.rotation, 0);
});

test('Roda durante arraste gira e move junto; cancelamento preserva token', async () => {
  const f = mock();
  const instance = await installFastRotate(f.OBR);
  f.mode.onToolDown({ metadata: { angle: 45 } }, { target: f.token, pointerPosition: { x: 5, y: 6 } });
  await tick();
  f.mode.onToolDragStart({metadata:{angle:45}}, { target: f.token, pointerPosition: { x: 5, y: 6 } });
  f.mode.onToolDragMove({}, { pointerPosition: { x: 25, y: 26 } });
  instance.wheel(-1);
  assert.equal(f.interaction.preview.rotation, 305);
  assert.deepEqual(f.interaction.preview.position, { x: 120, y: 100 });
  f.mode.onToolDragCancel();
  assert.equal(f.token.rotation, 350);
  assert.deepEqual(f.token.position, { x: 100, y: 80 });
  assert.equal(f.interaction.stopped, true);
});

test('Não gera atualização ao clicar e soltar sem mexer', async () => {
  const f = mock();
  await installFastRotate(f.OBR);
  f.mode.onToolDown({ metadata: { angle: 15 } }, { target: f.token, pointerPosition: { x: 0, y: 0 } });
  await tick();
  f.mode.onToolUp({}, { pointerPosition: { x: 0, y: 0 } });
  await tick();
  assert.equal(f.changes.filter(([x])=>x==='items').length,0);
});
