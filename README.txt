# Hotel das Férias – Web Endless PWA (Singleplayer) para Railway

## Como publicar no Railway
1. Crie um repositório GitHub e **suba esta pasta inteira**.
2. No **Railway.app** → **New Project** → **Deploy from GitHub Repo**.
3. Espere o build. Railway detecta **Node 18+** e executa `npm start`.
4. Acesse a **Public URL** (ex.: `https://seu-projeto.up.railway.app`).

**Servidor**: `server.js` entrega os arquivos de `public/`.
**PWA**: `manifest.webmanifest` + `service-worker.js` permitem instalação e uso offline.

## Rodar local
```bash
npm install
npm start
# abre http://localhost:3000
```
