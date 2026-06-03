# Haxball Headless Host Persistente

Este proyecto levanta una sala de Haxball Headless Host y guarda informacion en SQLite usando solo Node.js:
- jugadores que entran/salen
- cambios de equipo
- goles
- inicio/fin de partido
- resultado final

Ademas expone una API HTTP y permite extender comportamiento con plugins.

El host se inicializa con `haxball.js` (sin navegador), por lo que no depende de `window.HBInit`.

## Requisitos
- Node.js 18+
- Un token valido de Haxball para host headless

## Configuracion
1. Instala dependencias:
   ```bash
   npm install
   ```
2. Copia variables de entorno:
   ```bash
   cp .env.example .env
   ```
3. Exporta variables en tu shell (o cargalas con tu gestor favorito):
   ```bash
   export HAXBALL_TOKEN="TU_TOKEN"
   export HAXBALL_ROOM_NAME="Host Persistente"
   export API_PORT="3000"
   ```

Variables opcionales utiles:
- `HAXBALL_SCORE_LIMIT` (default `5`)
- `HAXBALL_TIME_LIMIT` (default `5`)
- `HAXBALL_TEAMS_LOCK` (`true|false`, default `false`)
- `HAXBALL_PROXY` (proxy HTTP para crear salas adicionales)

## Ejecutar host
```bash
npm run start
```

Al iniciar, se crea/actualiza:
- `data/haxball.sqlite`

Tambien levanta API en `http://localhost:3000` (o el puerto de `API_PORT`).

## API disponible
- `GET /health`
- `GET /api/players`
- `GET /api/events?limit=100`
- `GET /api/matches?limit=50`
- `GET /api/matches/:matchId`
- `GET /api/stats/wins`

## Analisis rapido
```bash
npm run analyze
```

## Plugins
Los plugins viven en `plugins/*.js` y se cargan automaticamente al iniciar.

Interfaz esperada del plugin:

```js
module.exports = ({ db, logger }) => ({
   name: "mi-plugin",
   onStart() {},
   onStop() {},
   onEvent(event, context) {},
   registerApiRoutes(app) {
      app.get("/api/plugins/mi-plugin/ping", (_req, res) => res.json({ ok: true }));
   },
});
```

Ejemplo real incluido:
- `plugins/example-plugin.js`

## Notas
- Para mantener el host corriendo en un servidor remoto, deja el proceso vivo con tmux/screen/systemd.
- Si reinicias el proceso, el historial permanece en `data/haxball.sqlite`.
