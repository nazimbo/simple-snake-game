// Smoke test for a no-build static site: every local file that index.html
// references must exist on disk.
//
// This site has no bundler, so nothing validates those paths. Rename or delete
// a script and nginx answers 404 for it while still serving a 200 for the page
// itself — the app breaks in the browser and every uptime check stays green.
// That is exactly the failure this catches, and it needs no dependencies.
//
// Usage: node scripts/check-assets.mjs [index.html]

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const entry = process.argv[2] || "index.html";
const html = readFileSync(entry, "utf8");
const base = dirname(entry);

// src="..." on <script>/<img>, href="..." on <link>. Skip anything absolute,
// protocol-relative, or a data/anchor URI — only local files are ours to check.
const refs = [...html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((u) => !/^(?:[a-z]+:|\/\/|#|data:)/i.test(u))
  .map((u) => u.split(/[?#]/)[0])
  .filter(Boolean);

const unique = [...new Set(refs)];
const missing = unique.filter((u) => !existsSync(normalize(join(base, u.replace(/^\//, "")))));

for (const u of unique) console.log(`  ${missing.includes(u) ? "MISSING" : "ok     "} ${u}`);

if (missing.length) {
  console.error(`\n${missing.length} referenced file(s) do not exist:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nAll ${unique.length} referenced local file(s) exist.`);
