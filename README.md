# Internet in Motion

Internet in Motion is a guided, beginner-friendly exploration of what happens when someone opens a website. It keeps each explanation beside its moving visual so learners can connect a networking idea with the behavior it produces.

The experience follows one recognizable request from a device to a website and back. Learners can pause the motion, step through the request, make predictions, change network conditions, and replay scenes at their own pace.

## The learning journey

The single-page lesson contains eight connected chapters:

1. **Network** — devices exchange information over connections.
2. **Local network** — Wi-Fi or Ethernet links a device to a local gateway.
3. **Packets** — data is divided, carried, detected when missing, and reassembled.
4. **IP and DNS** — a domain name can be resolved to one or more current addresses.
5. **Routing** — routers choose next hops and can use an alternate path after routes update.
6. **TCP, UDP, and QUIC** — transport behavior changes how applications handle delivery, order, and timeliness.
7. **Opening a website** — DNS, secure transport, HTTP requests, responses, and rendering work together.
8. **Performance** — latency, available bandwidth, and loss shape the experience in different ways.

A final Packet Playground recombines the ideas. Learners can change DNS caching, path availability, transport, latency, bandwidth, and loss, then read the resulting event log.

## Learning design

- Motion and explanation stay close together.
- One journey thread connects the individual chapters into a causal story without implying that a single packet is reused end to end.
- Prediction checks give immediate, explanatory feedback.
- Every animation can be paused or replayed, and guided sequences can be stepped through manually.
- Simulations call out simplifications instead of presenting one path or timing result as universal.

The site is designed for first-time learners. Technical terms are introduced in context, while optional detail remains available through the interactive scenes.

## Technical notes

Internet behavior varies by device, network, protocol, location, cache state, and time. Values shown in the site are illustrative teaching examples rather than measurements. DNS answers can change, routes are not guaranteed to be symmetric, and browsers may reuse cached answers, files, or existing connections.

The site uses Next.js with client-side React components, CSS motion, and no runtime data service. It exports to static files for GitHub Pages.

## Accessibility

The experience uses native buttons, links, form controls, visible focus states, live status updates, and descriptive labels. It respects reduced-motion preferences and provides a page-wide motion pause control.

## Run and verify locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

Before publishing, run the same production checks used by the repository:

```bash
npm run lint
npm test
```

The production build is a static export written to `out/`.
