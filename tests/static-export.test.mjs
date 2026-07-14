import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("exports the complete branded experience", async () => {
  const html = await readFile(new URL("out/index.html", projectRoot), "utf8");

  assert.match(html, /<title>Internet in Motion — Networking, visually explained<\/title>/i);
  assert.match(html, /Internet in Motion/);
  assert.match(html, /See the Internet/);
  assert.match(html, /Networking, visually explained/);
  assert.match(html, /Simplified TCP lab/);
  assert.match(html, /TCP or QUIC/);
  assert.match(html, /https:\/\/google\.com/);
  assert.match(html, /One journey/);
  assert.match(html, /If no usable cached address/);
  assert.match(html, /Reveal example IP/);
  assert.match(html, /Continuous journey thread/);
  assert.match(html, /Quick prediction/);
  assert.match(html, /Packet Playground: run the whole request journey/);
  assert.match(html, /Your event log will appear here/);
  assert.match(html, /Teaching model—not a measurement/);
  assert.match(html, /https:\/\/daniissac\.com\/internet-in-motion\//);
  assert.match(html, /\/internet-in-motion\/_next\//);
  assert.doesNotMatch(html, /site-creator-vinext-starter|codex-preview/i);
  assert.doesNotMatch(html, /visually explained by/i);
  assert.doesNotMatch(html, /internetinmotion\.test|203\.0\.113\.42/i);
  assert.doesNotMatch(html, /phase-number/);
});

test("includes the GitHub Pages artifact and deployment workflow", async () => {
  await Promise.all([
    access(new URL("out/404.html", projectRoot)),
    access(new URL("out/_next/static", projectRoot)),
    access(new URL("out/og.png", projectRoot)),
  ]);

  const [workflow, packageJson, layout] = await Promise.all([
    readFile(new URL(".github/workflows/deploy-pages.yml", projectRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
  ]);

  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /path:\s*\.\/out/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(packageJson, /"name": "internet-in-motion"/);
  assert.match(layout, /https:\/\/daniissac\.com\/internet-in-motion\//);
  assert.doesNotMatch(layout, /next\/headers|generateMetadata/);
});
