// Regenerate the Orinos desktop icon from resources/icon.svg.
// Requires macOS iconutil (for .icns); PNG output works everywhere.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const svg = path.join(root, "resources/icon.svg");
const png = path.join(root, "resources/icon.png");
const icns = path.join(root, "resources/icon.icns");

await sharp(svg, { density: 1024 }).resize(1024, 1024).png().toFile(png);
console.log(`wrote ${path.relative(root, png)}`);

if (process.platform !== "darwin") {
  console.log("skip icon.icns: iconutil is macOS-only");
  process.exit(0);
}

const iconset = path.join(os.tmpdir(), `orinos-iconset-${process.pid}.iconset`);
fs.rmSync(iconset, { recursive: true, force: true });
fs.mkdirSync(iconset, { recursive: true });
const variants = [
  [16, "icon_16x16.png"],
  [32, "icon_16x16@2x.png"],
  [32, "icon_32x32.png"],
  [64, "icon_32x32@2x.png"],
  [128, "icon_128x128.png"],
  [256, "icon_128x128@2x.png"],
  [256, "icon_256x256.png"],
  [512, "icon_256x256@2x.png"],
  [512, "icon_512x512.png"],
  [1024, "icon_512x512@2x.png"],
];

for (const [size, name] of variants) {
  await sharp(svg, { density: 1024 }).resize(size, size).png().toFile(path.join(iconset, name));
}

execFileSync("iconutil", ["-c", "icns", iconset, "-o", icns]);
fs.rmSync(iconset, { recursive: true, force: true });
console.log(`wrote ${path.relative(root, icns)}`);
