# Usa una imagen base oficial de Node.js (bookworm-slim es ligera y compatible con SQLite/Prisma)
FROM node:22-bookworm-slim

# Instalar openssl (requerido por Prisma para conectarse a la base de datos)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de definición de dependencias
COPY package.json package-lock.json ./

# Instalar las dependencias (usamos ci para una instalación más limpia basada en el package-lock)
RUN npm ci

# Copiar el esquema de Prisma y generar el cliente de base de datos
COPY prisma ./prisma
RUN npx prisma generate

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto de la API (por defecto 3000 según .env.example)
EXPOSE 3000

# Comando por defecto para iniciar el host
CMD ["npm", "start"]
