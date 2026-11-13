import OBR from '@owlbear-rodeo/sdk';
import { TOOL_ID } from './rotate-controller.js';
import { parseStepAngle, stepFromMetadata } from './angle.js';

const angleInput = document.querySelector('#angle');
const status = document.querySelector('#status');
const presetButtons = [...document.querySelectorAll('[data-step]')];
const buttons = [...document.querySelectorAll('button')];
let currentAngle = 15;
let saving = false;

function show(value) {
  currentAngle = value;
  angleInput.value = String(value).replace('.', ',');
  for (const b of presetButtons) b.setAttribute('aria-pressed', String(Number(b.dataset.step) === value));
}
function message(text, isError = false) {
  status.textContent = text;
  status.style.color = isError ? '#ffc0bd' : '#a7ddc9';
}
function busy(value) {
  saving = value;
  for (const b of buttons) b.disabled = value;
  angleInput.disabled = value;
}
async function save(value) {
  if (saving) return;
  const next = parseStepAngle(value);
  if (next === null) {
    message('Use 0,1° a 360°', true);
    angleInput.focus();
    return;
  }
  busy(true);
  message('Salvando…');
  try {
    await OBR.tool.setMetadata(TOOL_ID, { angle: next });
    show(next);
    message('Salvo');
  } catch (error) {
    console.error('[Giro Rápido] Falha ao salvar ângulo', error);
    show(currentAngle);
    message('Erro ao salvar', true);
  } finally {
    busy(false);
  }
}

if (OBR.isAvailable) {
  OBR.onReady(async () => {
    try {
      const metadata = await OBR.tool.getMetadata(TOOL_ID);
      show(stepFromMetadata(metadata));
      message('Pronto');
    } catch (error) {
      console.error('[Giro Rápido] Falha ao ler ângulo', error);
      message('Erro ao carregar', true);
    }
  });
} else {
  show(15);
  message('Abra no Owlbear');
}

angleInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); void save(angleInput.value); }
});
angleInput.addEventListener('change', () => { void save(angleInput.value); });
document.querySelector('#less').addEventListener('click', () => { void save(Math.max(.1, Math.round((currentAngle-1)*100)/100)); });
document.querySelector('#more').addEventListener('click', () => { void save(Math.min(360, Math.round((currentAngle+1)*100)/100)); });
for (const b of presetButtons) b.addEventListener('click', () => { void save(b.dataset.step); });
