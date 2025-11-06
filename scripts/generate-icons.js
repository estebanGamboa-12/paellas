import sharp from "sharp";
import fs from "fs";

const sizes = [192, 512];

if (!fs.existsSync("public/icons")) {
  fs.mkdirSync("public/icons", { recursive: true });
}

sizes.forEach(size => {
  sharp("public/logo.svg")
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`)
    .then(() => console.log(`✅ icon-${size}.png generado`))
    .catch(err => console.error(err));
});
