import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("contains the complete eight-chapter experience", async () => {
  const [html, css, script] = await Promise.all([
    readFile(new URL("index.html", projectRoot), "utf8"),
    readFile(new URL("styles.css", projectRoot), "utf8"),
    readFile(new URL("script.js", projectRoot), "utf8"),
  ]);

  assert.match(html, /<title>Internet in Motion \| Networking, visually explained<\/title>/i);
  assert.match(html, /See the Internet/);
  assert.match(html, /Reliable delivery/);
  assert.match(html, /Two Delivery Styles/);
  assert.match(html, /Quick prediction/);
  assert.match(html, /Your request story will appear here/);
  assert.match(html, /https:\/\/daniissac\.com\/internet-in-motion\//);
  assert.match(html, /name="viewport"/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.mini-route \{ position: relative;/);
  assert.match(css, /@keyframes hello/);
  assert.match(html, /class="local-packet">data/);
  assert.match(css, /@keyframes local-travel/);
  assert.match(css, /@keyframes packet-drop/);
  assert.match(css, /@keyframes packet-return/);
  assert.match(script, /requests piece 3 again/);
  assert.match(html, /Router A[\s\S]+Primary[\s\S]+Router B[\s\S]+Alternate/);
  assert.match(css, /@keyframes route-flow/);
  assert.match(script, /packet uses Router B/);
  assert.match(html, /id="transport-output"/);
  assert.match(css, /@keyframes transport-travel/);
  assert.match(script, /QUIC includes TLS in its transport handshake/);
  assert.match(script, /restartAnimation\(output, "playing"\)/);
  assert.match(script, /calculateJourney/);
  assert.doesNotMatch(html + css + script, /react|next\/|vite|node_modules/i);

  for (const id of ["network", "local", "packets", "dns", "routing", "transport", "website", "performance"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }
});

test("uses only local browser assets and a dependency-free Pages workflow", async () => {
  await Promise.all([
    access(new URL("public/favicon.svg", projectRoot)),
    access(new URL("public/og.png", projectRoot)),
    access(new URL("LICENSE", projectRoot)),
  ]);

  const [workflow, index] = await Promise.all([
    readFile(new URL(".github/workflows/deploy-pages.yml", projectRoot), "utf8"),
    readFile(new URL("index.html", projectRoot), "utf8"),
  ]);

  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /path:\s*\.\/_site/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(workflow, /npm|pnpm|yarn/);
  assert.doesNotMatch(index, /https?:\/\/[^"']+\.(?:css|js)/);
  assert.match(index, /https:\/\/daniissac\.com\/internet-in-motion\//);
});
