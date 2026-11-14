import sharp from "sharp";
await sharp("assets/icon.svg").resize(1024,1024).png().toFile("assets/icon.png");
await sharp("assets/adaptive-foreground.svg").resize(1024,1024).png().toFile("assets/adaptive-foreground.png");
console.log("App icons generated.");
