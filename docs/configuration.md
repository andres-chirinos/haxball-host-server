# Configuración y Entorno

El servidor está diseñado para ser altamente personalizable mediante dos vías: el archivo **`.env`** (para secretos y despliegue) y el archivo **`src/config.ts`** (para configuración general mapeada a código).

## 1. El Archivo `.env`

El `.env` es el corazón de la seguridad de tu host.
Asegúrate de definir estas variables:

```ini
HAXBALL_TOKEN="TU_TOKEN"
HAXBALL_ROOM_NAME="Mi Servidor"
HAXBALL_MAX_PLAYERS="16"
HAXBALL_PUBLIC="true"

# Autenticación y Seguridad
AUTH_MODE="offline" # Opciones: "offline" o "haxball"
PASSWORD_SALT="cambia_esta_frase_por_seguridad"

# Opciones Generales
LOG_LEVEL="info" # Opciones: "debug", "info", "warn", "error"
API_PORT=3000
```

### Modos de Autenticación (`AUTH_MODE`)
- **`haxball`**: Los jugadores son identificados por su token único de Haxball (la clave criptográfica asociada a su cuenta del navegador). No necesitan introducir comandos.
- **`offline`**: Los jugadores no necesitan cuentas validadas por Haxball. Para proteger sus estadísticas, el `auth-plugin` exige que se registren (`!register <contraseña>`) y se logueen (`!login <contraseña>`).

### Logs (`LOG_LEVEL`)
- **`debug`**: Extremadamente verboso, usado para desarrollo. Muestra consultas, flujos de eventos paso a paso.
- **`info`**: Default recomendado. Avisa de cosas como entradas/salidas, inicio de sala y recargas de plugins.

---

## 2. Archivo `src/config.ts`

Aquí se exporta la constante global `config` que tu aplicación consume. Generalmente toma el valor del `.env`, pero puedes codificar en duro opciones o extender este archivo (por ejemplo, para agregar listas de mapas por defecto, reglas anti-spam, roles de administradores, etc).
