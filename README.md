# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Docker

`Dockerfile` and `compose.yaml` run the app as one container, published on
`127.0.0.1:3000` for the reverse proxy of the host. `docker/nginx.example.conf`
is a starting point for that proxy.

```bash
docker compose up -d --build
```

### Server

Clone the repository on the server and run the update script. It builds the
image there, from the commit it deploys; nothing is pulled from a registry.

```bash
git clone https://github.com/WolfgangDrescher/asta_fahrtkosten.git
cd asta_fahrtkosten
docker/update.sh
```

On the first run the script creates `.env` from `.env.example` and generates
the ALTCHA secret. Fill in the mail account (`EMAIL_USERNAME`, `EMAIL_PASSWORD`,
`EMAIL_TO`) and run it again. Later runs update to the newest commit of
`master`; `docker/update.sh <commit>` deploys (or rolls back to) a specific
commit. The deployed commit is kept in `.env` as `COMMIT_HASH`.
