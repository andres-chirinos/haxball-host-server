# Usa Node.js 22 en una imagen slim para reducir superficie de ataque y mantener compatibilidad con módulos nativos
FROM node:22-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de definición de dependencias
COPY package.json package-lock.json ./



# Instalar las dependencias (usamos install en lugar de ci para evitar un bug de npm)
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto de la API
EXPOSE 3000

# Comando para configurar (setup) y luego iniciar la aplicación
CMD ["sh", "-c", "npm run setup && npm start"]
