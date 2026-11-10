# syntax=docker/dockerfile:1

# The Nuxt application as a plain Node application. docker/update.sh builds
# this image on the server, there is no registry involved.
ARG NODE=24


# The build. The dependencies are installed before the sources are copied, so
# a change in the sources does not install them again. The install scripts are
# skipped because `nuxt prepare` (postinstall) needs the sources, and
# `nuxt build` runs it anyway.
FROM node:${NODE}-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . ./
RUN npm run build


# The runtime. Nuxt Content keeps its database in .data, everything else is
# read only (see compose.yaml).
FROM node:${NODE}-bookworm-slim
WORKDIR /app
COPY --from=build --chown=node:node /build/.output ./.output
RUN mkdir .data && chown node:node .data
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
