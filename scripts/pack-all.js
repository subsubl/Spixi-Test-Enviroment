const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const appsDir = path.join(__dirname, '..', 'apps');
const outputDir = path.join(__dirname, '..', 'packed');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const items = fs.readdirSync(appsDir, { withFileTypes: true });

for (const it of items) {
  if (!it.isDirectory()) continue;
  // Ensure icon conversions for apps that provide SVGs
  try {
    const conv = spawnSync('node', [path.join(__dirname, 'generate-icons.js')], { stdio: 'inherit' });
    if (conv.error) console.warn('Icon convert failed:', conv.error);
  } catch (e) {}
  const appPath = path.join(appsDir, it.name);
  console.log(`\n----- Packing ${it.name} -----`);
  const r = spawnSync('node', [path.join(__dirname, '..', 'pack-app.js'), appPath, outputDir], { stdio: 'inherit' });
  if (r.error) {
    console.error(`Error packing ${it.name}:`, r.error);
  }
  if (r.status !== 0) {
    console.warn(`pack-app.js returned non-zero exit (${r.status}) for ${it.name}`);
  }
}

console.log('\nAll pack attempts finished.');
