# Creación de Plugins

La arquitectura de este host permite extender su funcionalidad de forma limpia y moderna usando un **Framework de Plugins** muy similar a librerías populares como `discord.py`.

Los plugins deben colocarse dentro de la carpeta `plugins/` y terminar en `.ts` (o `.js`).

## Estructura de un Plugin Básico

Todo plugin debe importar la clase `Plugin` e instanciarla. Al final, se debe realizar un `export default` de la instancia.

```typescript
import { Plugin } from "../src/lib/plugin";

// El nombre que proveas será el nombre del archivo de log: logs/plugin-mi-plugin-FECHA.log
const miPlugin = new Plugin("mi-plugin");

// Ejemplo: Escuchando un evento nativo de Haxball
miPlugin.on("game_start", (event, ctx) => {
  miPlugin.logger.info("El partido acaba de comenzar");
});

// Ejemplo: Registrando un comando en el chat
miPlugin.command("ping", { hideTrigger: false }, ({ reply }) => {
  reply("¡Pong!");
});

export default miPlugin;
```

## Sistema de Comandos (`command`)

A diferencia de versiones anteriores, **todos los comandos utilizan el prefijo `!`** (Ej. `!ping`). El jugador jamás usa `/` (ya que Haxball bloquea esos mensajes nativamente).

### Comandos Ocultos (Privados)
Para comandos como contraseñas o comandos administrativos que no quieres que inunden el chat global, usa `{ hideTrigger: true }`. Haxball procesará el comando pero nadie en la sala lo leerá.

```typescript
miPlugin.command("login", { hideTrigger: true }, ({ args, player, replyPrivate }) => {
  const pass = args[0];
  miPlugin.logger.info(`El jugador ${player.name} intentó loguearse`);
  
  // replyPrivate envía el mensaje SOLO a ese jugador
  replyPrivate("Intentando iniciar sesión...");
});
```

### Parámetros de CommandContext

El _callback_ del comando recibe un objeto `CommandContext` con los siguientes datos:
- `player`: Objeto con la información básica (id, name, team, admin).
- `args`: Un Array de `string` con las palabras que siguen al comando (Ej. `!ban Juan 10` -> `args = ["Juan", "10"]`).
- `room`: El objeto original de `HBInit` con la API completa de Haxball.
- `db`: Cliente Prisma para ejecutar queries a la base de datos.
- `reply(msg)`: Función rápida para responder en el chat general.
- `replyPrivate(msg)`: Función rápida para responderle en privado al usuario.

## Rutas API (`api`)

Si deseas que tu plugin exponga información a la web (por ejemplo, para crear un panel web), puedes extender el servidor Express:

```typescript
miPlugin.api((app) => {
  app.get("/api/plugins/mi-plugin/estado", (req, res) => {
    res.json({ activo: true });
  });
});
```
