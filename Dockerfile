# ---- build
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY server/package*.json server/
COPY client/package*.json client/
RUN npm --prefix server ci && npm --prefix client ci
COPY server server
COPY client client
RUN npm --prefix server run build && npm --prefix client run build \
 && npm --prefix server prune --omit=dev

# ---- run
FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data CLIENT_DIST=/app/client/dist
# Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN, or mount a persistent volume at /data.
WORKDIR /app/server
COPY --from=build /app/server/node_modules node_modules
COPY --from=build /app/server/dist dist
COPY --from=build /app/server/package.json .
COPY --from=build /app/client/dist /app/client/dist
RUN mkdir -p /data
EXPOSE 8080
CMD ["node", "dist/index.js"]
