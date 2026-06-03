# Usa la imagen completa de Node.js 20 (LTS) para mayor estabilidad al compilar módulos nativos
FROM node:20-bookworm

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de definición de dependencias
COPY package.json package-lock.json ./

# Instalar tsx globalmente para asegurar que esté disponible en el CMD
RUN npm install -g tsx

# Instalar las dependencias (usamos install en lugar de ci para evitar un bug de npm)
RUN npm install

# Copiar el esquema de Prisma y generar el cliente (ahora con network: host no fallará el DNS)
COPY prisma ./prisma
RUN npx prisma generate

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto de la API
EXPOSE 3000

# Comando para configurar (setup) y luego iniciar la aplicación
CMD ["sh", "-c", "npm run setup && npm start"]
