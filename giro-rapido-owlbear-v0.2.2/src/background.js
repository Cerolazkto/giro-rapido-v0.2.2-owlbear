import OBR from '@owlbear-rodeo/sdk';
import { installFastRotate } from './rotate-controller.js';
import { createWheelBridge } from './wheel-bridge.js';

if (OBR.isAvailable) {
  OBR.onReady(() => {
    let instance = null;
    const bridge = createWheelBridge(window, (count) => instance?.wheel(count));
    installFastRotate(OBR, bridge).then((controller) => {
      instance = controller;
    }).catch((error) => {
      bridge.dispose();
      console.error('[Giro Rápido] Falha ao iniciar a ferramenta', error);
    });
  });
}
