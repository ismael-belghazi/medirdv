FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs stockage.mjs deploiement.mjs gcp.mjs ./
COPY public ./public
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
