// Иҷро мешавад ҳамчун `postinstall` (--soft) ва `prestart`.
//
// Хатои Render: "Cannot find module '/opt/render/project/src/dist/server.js'".
// Сабаб: dist/ дар .gitignore аст → Render бояд худаш build кунад, вале
// Build Command танҳо `npm install` буд. Азбаски npm баъди install
// `postinstall`-ро иҷро мекунад, build маҳз дар ҳамон ҷо ба амал меояд —
// новобаста аз он ки дар dashboard кадом Build/Start Command навишта шудааст.
//
// --soft: агар typescript насб набошад (npm install --omit=dev), хато нанамуда
//         мегузарад; prestart бори дигар кӯшиш мекунад.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const soft = process.argv.includes('--soft');
const root = path.join(__dirname, '..');
const entry = path.join(root, 'dist', 'server.js');

if (fs.existsSync(entry)) process.exit(0);

function fail(reason, recoverable) {
  const msg = `
[build] ${soft && recoverable ? '⚠️' : '❌'} build нашуд — ${reason}

Дар Render → Settings инҳоро гузоред:
    Build Command:  npm install --include=dev && npm run build
    Start Command:  npm start
`;
  if (soft && recoverable) { console.warn(msg); process.exit(0); }
  console.error(msg);
  process.exit(1);
}

let tsc;
try {
  tsc = require.resolve('typescript/bin/tsc', { paths: [root] });
} catch {
  fail('typescript насб нашудааст (devDependencies партофта шуд)', true);
}

console.log('[build] dist/ нест — компиляция оғоз мешавад...');
for (const step of [tsc, path.join(__dirname, 'copy-schema.js')]) {
  const r = spawnSync(process.execPath, [step], { stdio: 'inherit', cwd: root });
  if (r.status !== 0) fail(`қадам ноком шуд: ${path.basename(step)}`, false);
}

if (!fs.existsSync(entry)) fail('dist/server.js баъд аз build низ нест', false);
console.log('[build] ✅ dist/ тайёр аст');
