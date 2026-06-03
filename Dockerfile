# Usa la imagen completa de Node.js 20 (LTS) para mayor estabilidad al compilar módulos nativos
FROM node:20-bookworm

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
CMD ["sh", "-c", "npx tsx src/setup.ts && npx tsx src/runner.ts"]
