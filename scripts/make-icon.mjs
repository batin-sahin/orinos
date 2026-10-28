#!/usr/bin/env node
/** Generates the app icon (PNG + ICNS) with sharp. Run once; assets are committed. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resources = path.join(root, "resources");
fs.mkdirSync(resources, { recursive: true });

const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="1024">
      <stop offset="0" stop-color="#0a0c14"/>
      <stop offset="1" stop-color="#121827"/>
    </linearGradient>
    <linearGradient id="ring" x1="170" y1="160" x2="860" y2="880">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="0.5" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
    <radialGradient id="core" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0" stop-color="#c4b5fd"/>
      <stop offset="0.45" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#312e81"/>
    </radialGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="34" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" rx="228" fill="url(#bg)"/>
  <rect x="26" y="26" width="972" height="972" rx="206" stroke="url(#ring)" stroke-opacity="0.18" stroke-width="2"/>
  <g opacity="0.96">
    <ellipse cx="512" cy="512" rx="380" ry="152" transform="rotate(-30 512 512)" stroke="url(#ring)" stroke-width="9" opacity="0.55"/>
    <ellipse cx="512" cy="512" rx="330" ry="118" transform="rotate(38 512 512)" stroke="url(#ring)" stroke-width="6" opacity="0.4"/>
    <circle cx="512" cy="512" r="238" stroke="url(#ring)" stroke-width="12" opacity="0.85"/>
  </g>
  <circle cx="512" cy="512" r="150" fill="#7c3aed" opacity="0.35" filter="url(#glow)"/>
  <circle cx="512" cy="512" r="112" fill="url(#core)"/>
  <circle cx="478" cy="474" r="34" fill="#ede9fe" opacity="0.75" filter="url(#soft)"/>
  <circle cx="742" cy="379" r="17" fill="#22d3ee"/>
  <circle cx="742" cy="379" r="32" fill="#22d3ee" opacity="0.25" filter="url(#soft)"/>
  <circle cx="287" cy="660" r="11" fill="#a78bfa"/>
</svg>`;

const png = await sharp(Buffer.from(svg)).resize(1024, 1024).png().toBuffer();
fs.writeFileSync(path.join(resources, "icon.png"), png);

const iconset = path.join(resources, "icon.iconset");
fs.rmSync(iconset, { recursive: true, force: true });
fs.mkdirSync(iconset, { recursive: true });
const sizes = [
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
for (const [size, name] of sizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(iconset, name));
}
try {
  execFileSync("iconutil", ["-c", "icns", iconset, "-o", path.join(resources, "icon.icns")]);
  console.log("Wrote resources/icon.icns");
} catch (err) {
  console.warn("iconutil failed (non-macOS?):", err.message);
}
fs.rmSync(iconset, { recursive: true, force: true });
console.log("Wrote resources/icon.png");
