FROM node:20-alpine

# Create non-root user
RUN addgroup -S ibalis && adduser -S ibalis -G ibalis

WORKDIR /app

COPY package.json ./

RUN npm ci --omit=dev

COPY server.js ./

# Hand off ownership to the non-root user
RUN chown -R ibalis:ibalis /app

USER ibalis

EXPOSE 3100

CMD ["node", "server.js"]
