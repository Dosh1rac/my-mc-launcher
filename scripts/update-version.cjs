const fs = require('fs');
const version = require('../package.json').version;

function patch(file, fn) {
  const before = fs.readFileSync(file, 'utf8');
  const after = fn(before);
  if (after === before) {
    console.log(`skip ${file}`);
    return;
  }
  fs.writeFileSync(file, after);
  console.log(`updated ${file}`);
}

patch('package-lock.json', (text) => text.replace(/"version": "1\.5\.\d+"/g, `"version": "${version}"`));
patch('site/config.js', (text) => text.replace(/FALLBACK_VERSION = "[^"]*"/, `FALLBACK_VERSION = "${version}"`));
patch('site/index.html', (text) =>
  text
    .replace(/VOID-Setup-1\.5\.\d+\.exe/g, `VOID-Setup-${version}.exe`)
    .replace(/VOID-Portable-1\.5\.\d+\.exe/g, `VOID-Portable-${version}.exe`)
    .replace(/<b class="js-version">1\.5\.\d+<\/b>/, `<b class="js-version">${version}</b>`)
);
patch('README.md', (text) => text.replace(/\*\*Версия:\*\* 1\.5\.\d+/, `**Версия:** ${version}`));
patch('electron/renderer/index.html', (text) =>
  text.replace(/<div class="brand-sub" id="brandSub">[^<]*<\/div>/, `<div class="brand-sub" id="brandSub">${version} · deep space</div>`)
);
