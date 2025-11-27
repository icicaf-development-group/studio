# Usa una imagen oficial de Node.js como imagen base.
# La versión '20-slim' es una buena opción por ser ligera.
FROM node:20-slim

# Establece el entorno de producción.
ENV NODE_ENV=production

# Establece el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Copia los archivos de definición de dependencias.
COPY package.json ./

# Instala las dependencias del proyecto.
RUN npm install

# Copia el resto de los archivos de la aplicación al directorio de trabajo.
COPY . .

# Expone la clave de API de Gemini como un argumento de construcción para que pueda ser pasada durante la construcción de la imagen.
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Construye la aplicación Next.js para producción.
RUN npm run build

# Expone el puerto en el que se ejecuta la aplicación Next.js (el predeterminado es 3000).
EXPOSE 3000

# El comando para iniciar la aplicación cuando se ejecute el contenedor.
CMD ["npm", "start"]
