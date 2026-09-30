import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'src'), { recursive: true });

for (const file of ['index.html']) fs.copyFileSync(path.join(root, file), path.join(dist, file));
for (const file of ['app.js', 'questions.js', 'config.js', 'styles.css']) {
  fs.copyFileSync(path.join(root, 'src', file), path.join(dist, 'src', file));
}

fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('Build estático creado en dist/.');
