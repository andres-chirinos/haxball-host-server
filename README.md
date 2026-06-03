# Haxball Headless Host Persistente

Una infraestructura avanzada, modular y robusta para alojar salas de **HaxBall Headless Host** usando **TypeScript**, **Prisma (SQLite)** y **Node.js**. Diseñada para servidores persistentes, con un framework de plugins al estilo `discord.py` y autenticación offline.

## Características Principales
- **Persistencia Real**: Guarda estadísticas de jugadores, resultados, goles y eventos en SQLite. Ahora rastrea e identifica jugadores por nombre o por su firma (`auth`), en vez de usar IDs volátiles.
- **Framework de Plugins**: Construye bots complejos, comandos y reglas muy fácilmente exportando una instancia de `Plugin`.
- **Comandos de Chat Avanzados**: Todos los comandos usan `!`. Los plugins pueden definir comandos invisibles (ej. `!login`) para que la contraseña nunca aparezca en el chat público.
- **Doble Modo de Autenticación**: Admite usar cuentas oficiales de Haxball, o un modo "offline" con registro de contraseñas.
- **Sistema de Logs**: Guarda todos los eventos por fechas y en archivos separados (Core y Plugins) para auditoría.

---

## 🛠️ Requisitos
- Node.js 18+
- Un token válido de Haxball para el host headless

## 🚀 Instalación Rápida

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Crea el archivo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
3. Edita `.env` para añadir tu `HAXBALL_TOKEN` y opcionalmente personalizar puertos y seguridad.
4. Genera la base de datos y tipados de Prisma:
   ```bash
   npm run setup
   ```
5. ¡Inicia el servidor!
   ```bash
   npm start
   ```

> Si ocurre algún error con Prisma durante el setup por versiones desactualizadas, corre `npx prisma db push --force-reset && npx prisma generate` (¡Ojo! Borrará los datos de SQLite).

## 📚 Documentación

Revisa la documentación detallada para explorar cómo modificar el servidor a tu gusto:
- **[Configuración General y Seguridad](docs/configuration.md)**
- **[Cómo crear Plugins y Comandos](docs/plugins.md)**

## 📊 API Integrada
El host levanta paralelamente una API REST en el puerto definido (`3000` por defecto):
- `GET /health`
- `GET /api/players`
- `GET /api/events?limit=100`
- `GET /api/matches?limit=50`
- `GET /api/matches/:matchId`
- `GET /api/stats/wins`

## 🔍 Análisis Rápido
Puedes verificar cuánta información hay en la base de datos ejecutando:
```bash
npm run analyze
```
