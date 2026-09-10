import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("ships the complete dependency-free lesson", async () => {
  const [html, css, script, workflow] = await Promise.all([
    read("index.html"), read("styles.css"), read("script.js"), read(".github/workflows/deploy-pages.yml"),
    access(new URL("public/favicon.svg", root)), access(new URL("public/og.png", root)), access(new URL("LICENSE", root)),
  ]);

  for (const id of ["network", "local", "packets", "dns", "routing", "transport", "website", "performance"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, new RegExp(`href="#${id}"`));
  }

  for (const marker of [
    "DNS happens before a new site connection", "Wi-Fi radio", "Reliable transport demo",
    "First router", "QUIC with integrated TLS 1.3", "Complete journey playback", "Modeled network time",
  ]) assert.ok(html.includes(marker), `missing lesson content: ${marker}`);

  for (const action of [
    "replay-route", "send-network-exchange", "send-local", "replay-packets", "drop-packet", "dns-lookup",
    "replay-routing", "replay-transport", "previous-step", "play-steps", "next-step", "replay-steps", "run-experiment",
  ]) {
    assert.ok(html.includes(`data-action="${action}"`), `missing control: ${action}`);
    assert.ok(script.includes(`case "${action}"`), `missing handler: ${action}`);
  }

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "HTML ids must be unique");
  assert.match(css, /@media \(max-width: 620px\)[\s\S]+prefers-reduced-motion/);
  assert.match(css, /label\.incorrect:has\(input:checked\)/);
  assert.match(script, /calculateJourney[\s\S]+Variable delay observed/);
  assert.ok(script.includes("ServerHello + certificate") && script.includes("Answer changed"));
  assert.doesNotMatch(html + css + script, /react|next\/|vite|node_modules/i);
  assert.doesNotMatch(html, /https?:\/\/[^"']+\.(?:css|js)/);
  assert.match(workflow, /configure-pages@v6[\s\S]+upload-pages-artifact@v5[\s\S]+path:\s*\.\/_site[\s\S]+deploy-pages@v5/);
  assert.doesNotMatch(workflow, /npm|pnpm|yarn/);
});
