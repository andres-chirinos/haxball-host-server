# Sistema de Permisos y Roles (RBAC tipo Discord)

El Haxball Host implementa un sistema avanzado de Control de Acceso Basado en Roles (RBAC), inspirado en la arquitectura de permisos de plataformas como Discord. Esto permite una granularidad y escalabilidad absolutas al momento de definir qué pueden o no hacer los jugadores.

## Características Principales

1. **Múltiples Roles por Jugador**: A diferencia de un sistema jerárquico simple, un jugador puede poseer múltiples roles simultáneamente (por ejemplo: `["user", "vip", "moderator"]`).
2. **Evaluación Aditiva con Veto (Deny override)**:
   - Los permisos de todos los roles de un jugador se combinan.
   - Si al menos **un rol** concede el permiso (`true`), el jugador tiene acceso.
   - **Excepción (Veto):** Si **cualquier rol** que posee el jugador establece un permiso explícitamente en `false`, ese permiso queda **denegado inmediatamente**, anulando cualquier otro rol que lo conceda. Esto es muy útil para roles de castigo como `muted` o `banned`.
   - Si el permiso no está definido en ningún rol (es decir, es `null` o inexistente), se **deniega** por defecto (modo seguro).
3. **Inmutabilidad en el Código**: La definición de qué rol tiene qué permisos no vive en la base de datos ni en el código TypeScript, sino en un archivo plano inmutable `data/roles.json`. Esto permite modificar permisos al vuelo y tenerlos versionados sin recompilar el código.

---

## Archivo Central de Roles (`data/roles.json`)

En este archivo se declaran todos los roles existentes y sus permisos correspondientes.

### Diccionario Completo de Permisos (Ejemplo)

A continuación, la lista de los identificadores de permisos (Keys) disponibles y sugeridos en la arquitectura del host:

#### 💻 Permisos de Comandos (Bot)
- `command.admin`: Permite usar comandos de administración críticos (`!addrole`, `!delrole`, configuraciones globales).
- `command.moderator`: Permite usar comandos de moderación y utilidad media.
- `command.user`: Permite usar comandos básicos (`!help`, `!info`, `!rank`).

#### 🎮 Permisos de Sala (Haxball Nativo)
- `room.admin`: Otorga la "estrella de administrador" nativa de Haxball a los jugadores.
- `room.kick`: Permite expulsar (kick) a otros jugadores.
- `room.ban`: Permite vetar (ban) y desvetar jugadores.
- `room.password`: Permite establecer o quitar la contraseña de la sala.
- `room.teams`: Permite mover a jugadores de un equipo a otro (rojo, azul, espectador).
- `room.stadium`: Permite cambiar el mapa/estadio.
- `room.game`: Permite iniciar, pausar y detener el partido.
- `room.colors`: Permite cambiar el color de los equipos.
- `room.chat`: Permite enviar mensajes de chat. (Utilizado comúnmente para roles como `"muted"` con valor `false`).

---

## Ejemplo Práctico de Evaluación

Dado el siguiente `roles.json`:
```json
{
  "user": {
    "command.user": true,
    "room.chat": true
  },
  "vip": {
    "room.colors": true
  },
  "muted": {
    "room.chat": false
  }
}
```

**Escenario 1:** Un jugador con los roles `["user", "vip"]` intenta cambiar el color del equipo.
- El sistema busca `room.colors`.
- El rol `user` no lo define (`null`).
- El rol `vip` lo concede (`true`).
- Resultado: **Permitido.**

**Escenario 2:** Un jugador con los roles `["user", "muted"]` intenta hablar por el chat.
- El sistema busca `room.chat`.
- El rol `user` lo concede (`true`).
- El rol `muted` lo deniega explícitamente (`false`).
- Resultado: El `false` tiene prioridad (veto). **Denegado.**

---

## Integración en Plugins (Para Desarrolladores)

Al crear nuevos comandos en los plugins, simplemente debes definir qué permiso exige dicho comando añadiendo la propiedad `permissions` (que recibe un array de strings):

```typescript
// Requiere tener el permiso 'command.admin'
myPlugin.command("reiniciar", { hideTrigger: true, permissions: ["command.admin"] }, ({ reply }) => {
  reply("Reiniciando el sistema...");
});

// Puede requerir múltiples permisos simultáneos (El jugador deberá cumplir TODOS)
myPlugin.command("mega_kick", { permissions: ["room.kick", "command.moderator"] }, ({ reply }) => {
  reply("Kickeando...");
});
```

Si omites la propiedad `permissions`, el comando será considerado **Público** y cualquier persona en la sala podrá ejecutarlo sin restricciones.
