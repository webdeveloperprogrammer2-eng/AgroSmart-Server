// Пеш аз `npm start` иҷро мешавад (prestart).
//
// Сабаби хатои Render "Cannot find module '.../dist/server.js'":
// dist/ дар .gitignore аст, пас Render бояд худаш build кунад. Агар
// Build Command build-ро иҷро накунад (ё ноком шавад), start меафтад.
// Ин скрипт чунин ҳолатро пешгирӣ мекунад.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const entry = path.join(root, 'dist', 'server.js');

if (fs.existsSync(entry)) process.exit(0);

console.warn('[prestart] dist/server.js ёфт нашуд — build оғоз мешавад...');

function fail(reason) {
  console.error(`
[prestart] ❌ BUILD НОКОМ ШУД — ${reason}

Дар Render → Settings → Build Command бояд ин бошад:
    npm install --include=dev && npm run build

Сабаби маъмул: typescript дар devDependencies аст, вале NODE_ENV=production
боиси он мешавад, ки npm devDependencies-ро насб накунад → tsc ёфт намешавад.
`);
  process.exit(1);
}

// tsc-ро мустақим бо node иҷро мекунем (бе shell — бе огоҳӣ, дар ҳама OS якхела).
let tsc;
try {
  tsc = require.resolve('typescript/bin/tsc', { paths: [root] });
} catch {
  fail('typescript насб нашудааст');
}

for (const step of [tsc, path.join(__dirname, 'copy-schema.js')]) {
  const r = spawnSync(process.execPath, [step], { stdio: 'inherit', cwd: root });
  if (r.status !== 0) fail(`қадам ноком шуд: ${path.basename(step)}`);
}

if (!fs.existsSync(entry)) fail('dist/server.js баъд аз build низ нест');
console.log('[prestart] ✅ build тайёр шуд');
