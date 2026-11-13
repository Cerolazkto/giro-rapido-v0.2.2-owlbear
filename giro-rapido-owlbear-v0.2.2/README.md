# Giro Rápido v0.2.2 — Owlbear Rodeo

Extensão para mover e girar tokens usando a rodinha do mouse com o complemento do Chrome/Edge.

## Instalação

```powershell
npm.cmd install
npm.cmd run dev
```

Instale `http://localhost:5173/manifest.json` como extensão no Owlbear.
Carregue também a pasta `giro-rapido-browser-v0.2.2` em `chrome://extensions` / `edge://extensions` com **Modo do desenvolvedor** > **Carregar sem compactação**. Remova/desative o complemento antigo para não interceptar a rodinha duas vezes.

## Controles

- Selecione **Giro Rápido** na barra do Owlbear.
- Segure um token de personagem, use a **rodinha** para girar e solte para salvar. A rotação não altera o zoom durante o gesto.
- E gira no sentido horário; Shift+E, no sentido inverso (alternativa sem complemento).
- Clique no pequeno **ícone de ângulo** ao lado da ferramenta para abrir o painel de configuração. Passo padrão: **15°**. Escolha 5°, 10°, 15°, 30°, 45°, 90° ou digite qualquer valor de **0,1° a 360°** (até 2 casas decimais). Use os botões − e + para ajustar em 1°.
- Cada jogador tem seu próprio passo, persistido nos metadados locais da ferramenta do Owlbear.
- Não são afetados tokens travados nem mapas.

## Segurança e limites

O complemento do navegador não pede permissões extras, não envia dados para servidores e só captura o scroll durante a interação ativa com a ferramenta. O projeto continua experimental; teste no Owlbear e em cenas descartáveis antes de usar em mesas importantes.

## Testes

```powershell
npm.cmd test
npm.cmd run build
```

O Quadro de Investigação é um projeto separado e não é alterado por esta atualização.
