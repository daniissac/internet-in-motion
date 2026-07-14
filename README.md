# Internet in Motion

**Networking, visually explained.**

Internet in Motion is a guided, interactive introduction to networking. Across eight chapters, it follows a website request from a device through DNS, packets, routing, transport protocols, and performance—and back again.

## Published address

The project is prepared for a GitHub Pages repository named `internet-in-motion`:

**https://daniissac.com/internet-in-motion/**

The existing `daniissac.github.io` user site owns the `daniissac.com` custom domain. This project should not add its own `CNAME`; as a project site, it inherits the domain and uses the repository name as its path.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Static production build

```bash
npm run build
```

The export is written to `out/` with the `/internet-in-motion/` base path required by GitHub Pages.

## Deployment

The workflow at `.github/workflows/deploy-pages.yml` builds and deploys the static export whenever `main` is updated. After creating the public `daniissac/internet-in-motion` repository:

1. Push this project to the `main` branch.
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. Run the workflow or push another update.

No separate custom domain should be configured on this project repository.

## Other build target

The original Vinext/Cloudflare build remains available for local compatibility:

```bash
npm run build:worker
```
