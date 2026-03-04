const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function makeIconSvg(size) {
    const r = Math.round(size * 0.18);
    const fs1 = Math.round(size * 0.45);
    const fs2 = Math.round(size * 0.13);
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
        `  <rect width="${size}" height="${size}" rx="${r}" fill="#3b82f6"/>`,
        `  <text x="50%" y="52%" font-size="${fs1}" font-weight="900" font-family="Arial,sans-serif" fill="white" text-anchor="middle" dominant-baseline="middle">K</text>`,
        `  <text x="50%" y="80%" font-size="${fs2}" font-weight="700" font-family="Arial,sans-serif" fill="rgba(255,255,255,0.8)" text-anchor="middle" dominant-baseline="middle">STORE</text>`,
        `</svg>`
    ].join('\n');
}

fs.writeFileSync(path.join(dir, 'icon-192.svg'), makeIconSvg(192));
fs.writeFileSync(path.join(dir, 'icon-512.svg'), makeIconSvg(512));
fs.writeFileSync(path.join(dir, 'icon-maskable.svg'), makeIconSvg(512));

// Also copy as png placeholder (SVG named as .png so manifest finds it)
fs.copyFileSync(path.join(dir, 'icon-192.svg'), path.join(dir, 'icon-192.png'));
fs.copyFileSync(path.join(dir, 'icon-512.svg'), path.join(dir, 'icon-512.png'));
fs.copyFileSync(path.join(dir, 'icon-maskable.svg'), path.join(dir, 'icon-maskable.png'));

console.log('Icons created in public/icons/');
