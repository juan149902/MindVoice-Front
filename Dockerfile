# -------- BUILD STAGE --------
FROM node:20 AS build

WORKDIR /app

# 🔥 Cache de dependencias
COPY package*.json ./

# 🔥 FIX: evita conflicto de Angular
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit

# 🔥 Copiar código después (para cache)
COPY . .

# 🔥 Limitar RAM para evitar crashes
ENV NODE_OPTIONS=--max-old-space-size=512

# 🔥 Build Angular
RUN npm run build

# -------- PRODUCTION STAGE --------
FROM nginx:alpine

# 🔥 Copiar build final
COPY --from=build /app/dist/app/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
