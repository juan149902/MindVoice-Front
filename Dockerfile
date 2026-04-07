# -------- BUILD STAGE --------
FROM node:20 AS build

WORKDIR /app

# 🔥 Cache de dependencias
COPY package*.json ./

# Más rápido y limpio
RUN npm ci --prefer-offline --no-audit

# 🔥 Copiar código después (para cache)
COPY . .

# 🔥 Limitar RAM para evitar crashes
ENV NODE_OPTIONS=--max-old-space-size=512

RUN npm run build

# -------- PRODUCTION STAGE --------
FROM nginx:alpine

COPY --from=build /app/dist/app/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
