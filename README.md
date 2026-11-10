# Fahrtkostenzuschuss AStA HfM Freiburg

Website of the AStA of the Hochschule für Musik Freiburg for applying for a
travel grant. Students upload the filled-in application form with their
receipts, the app checks the files and mails them to the AStA. Built with
[Nuxt](https://nuxt.com), [Nuxt UI](https://ui.nuxt.com),
[Nuxt Content](https://content.nuxt.com) and [ALTCHA](https://altcha.org).

## Setup

```bash
npm install
cp .env.example .env
```

`.env.example` lists the settings: the SMTP server that sends the applications,
the address they go to (an `@mh-freiburg.de` address) and the ALTCHA secret.

## Development

```bash
npm run dev
```

## Content

- Texts of the sections: `content/<language>/*.md`
- Translations of the interface: `i18n/locales/<language>.yaml`
- Application form as PDF: `public/fahrtkostenantrag.pdf`

## Server

`Dockerfile` and `compose.yaml` run the app as one container, published on
`127.0.0.1:3000` for the reverse proxy of the host; `docker/nginx.example.conf`
is a starting point for that proxy. Clone the repository on the server and run
the update script, which builds the image there from the commit it deploys:

```bash
git clone https://github.com/WolfgangDrescher/asta_fahrtkosten.git
cd asta_fahrtkosten
docker/update.sh
```

On the first run the script creates `.env` from `.env.example` and generates
the ALTCHA secret. Fill in the mail settings and run it again. Later runs
update to the newest commit of `master`; `docker/update.sh <commit>` deploys
(or rolls back to) a specific commit. The deployed commit is kept in `.env` as
`COMMIT_HASH`.
