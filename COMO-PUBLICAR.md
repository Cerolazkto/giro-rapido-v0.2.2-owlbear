# Giro Rápido v0.2.2 — lançamento gratuito

Este repositório contém **dois componentes**: a extensão web para Owlbear e o complemento do Chrome/Edge. Eles são necessários juntos para girar tokens com a rodinha do mouse.

## A. GitHub e Render Static Site (gratuito)

1. Abra no VS Code a pasta **giro-rapido-v0.2.2-publicacao** (a pasta que contém as duas subpastas).
2. Em Controle de Código-Fonte, escolha **Inicializar Repositório**, faça o primeiro commit e escolha **Publish to GitHub**. Pode escolher repositório público para facilitar o compartilhamento; privado também funciona com conexão autorizada ao Render.
3. No Render Dashboard, escolha **New > Static Site** (NÃO Web Service) e conecte esse novo repositório GitHub.
4. Use:
   - Name: `giro-rapido-owlbear` (ou outro nome disponível)
   - Branch: `main`
   - Root Directory: `giro-rapido-owlbear-v0.2.2`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
5. Publique. No painel do serviço estático, em **Settings > Headers**, acrescente:
   - Path: `/*`
   - Header: `Access-Control-Allow-Origin`
   - Value: `*`
6. Abra `https://SEU-DOMINIO.onrender.com/manifest.json` e confirme que o JSON é exibido. Confirme no PowerShell:

   ```powershell
   $r = Invoke-WebRequest -Uri "https://SEU-DOMINIO.onrender.com/manifest.json" -Headers @{Origin="https://www.owlbear.rodeo"}
   $r.StatusCode
   $r.Headers["Access-Control-Allow-Origin"]
   ```

   Respostas esperadas: `200` e `*`.

7. No Owlbear, instale a extensão pelo link HTTPS do manifesto e ative-a na sala. Desative a versão `localhost` para não duplicar ferramentas.

**Importante:** não há backend nem banco de dados. O Render oferece Static Sites gratuitos, sujeitos a limites do plano.

## B. Complemento Chrome ou Edge (cada jogador instala)

1. Compartilhe o ZIP `giro-rapido-complemento-chrome-edge-v0.2.2.zip` (junto deste pacote). Também é possível anexá-lo numa **Release** do seu GitHub.
2. Cada jogador extrai o ZIP para uma pasta definitiva no seu computador.
3. Chrome: `chrome://extensions`; Edge: `edge://extensions`.
4. Ative **Modo do desenvolvedor**, clique **Carregar sem compactação** e selecione a pasta extraída que contém `manifest.json`.
5. Reabra/recarregue a sala do Owlbear (`Ctrl + Shift + R`), selecione Giro Rápido e segure um token enquanto roda o scroll.
6. Não mantenha duas versões do complemento habilitadas ao mesmo tempo.

**Por que não instalar da Chrome Web Store?** Publicar na loja requer cadastro de desenvolvedor com pagamento único; carregar sem compactação dispensa esse custo, mas exige instalação manual em cada PC.

## C. Validação

- Abrir Owlbear **sem** VS Code/Vite e confirmar que a ferramenta aparece.
- Rodinha gira o token segurado, mas não dá zoom no mapa; ao soltar, o zoom volta.
- O valor padrão é 15° e cada jogador pode definir um valor personalizado.
- Testar em **uma segunda conta e outro computador** com o complemento instalado.

**Atenção:** Chrome/Edge em computador são o alvo do complemento; outros navegadores ou dispositivos móveis não têm garantia de suporte ao gesto.

## Publicar na vitrine do Owlbear

Depois de funcionar com seus jogadores, pode ser compartilhado na vitrine de extensões do Owlbear, conforme a documentação de Showcase. Isso é diferente de obter o selo de extensão verificada. A verificação exige requisitos adicionais, entre eles funcionamento nos principais navegadores e sem depender de outras extensões, o que a solução atual não cumpre.
