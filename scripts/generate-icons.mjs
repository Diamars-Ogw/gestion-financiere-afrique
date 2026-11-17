import fs from "node:fs/promises";
import sharp from "sharp";

await sharp("assets/icon.svg").resize(1024, 1024).png().toFile("assets/icon.png");
await sharp("assets/adaptive-foreground.svg").resize(1024, 1024).png().toFile("assets/adaptive-foreground.png");

await fs.mkdir("public/icons", { recursive: true });
for (const size of [180, 192, 512]) {
  await sharp("assets/icon.svg").resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
}

console.log("Native and PWA icons generated from the existing Mon Budget icon.");
