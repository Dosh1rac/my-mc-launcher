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

// package-lock: меняем только версию самого проекта, не трогая зависимости.
patch('package-lock.json', (text) => {
  const lock = JSON.parse(text);
  lock.version = version;
  if (lock.packages && lock.packages[""]) lock.packages[""].version = version;
  return JSON.stringify(lock, null, 2) + '\n';
});
patch('site/config.js', (text) => text.replace(/FALLBACK_VERSION = "[^"]*"/, `FALLBACK_VERSION = "${version}"`));
patch('site/index.html', (text) =>
  text
    .replace(/VOID-Setup-\d+\.\d+\.\d+\.exe/g, `VOID-Setup-${version}.exe`)
    .replace(/VOID-Portable-\d+\.\d+\.\d+\.exe/g, `VOID-Portable-${version}.exe`)
    .replace(/<b class="js-version">\d+\.\d+\.\d+<\/b>/, `<b class="js-version">${version}</b>`)
);
patch('README.md', (text) => text.replace(/\*\*Версия:\*\* \d+\.\d+\.\d+/, `**Версия:** ${version}`));
patch('electron/renderer/index.html', (text) =>
  text
    .replace(/<div class="brand-sub" id="brandSub">[^<]*<\/div>/, `<div class="brand-sub" id="brandSub">${version} · deep space</div>`)
);
patch('site/index.html', (text) => text.replace(/VOID \d+\.\d+\.\d+/g, `VOID ${version}`));
