// Builds a static site of the example pages that uses the BUILT bundle, for hosting (for example on Vercel):
//   npm run build:demo   ->  demo/   (index.html, search.html, occurrences.html, occurrence.html, dist/)
// The pages in examples/ import the source (../src/index.js) so that `npm run dev` can reload; here that import is
// pointed at the built file, which is what a real site would load.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'demo');

execFileSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: root, stdio: 'inherit' });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(path.join(root, 'dist'), path.join(out, 'dist'), { recursive: true });

for (const file of readdirSync(path.join(root, 'examples')).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(path.join(root, 'examples', file), 'utf8');
  if (!html.includes('../src/index.js')) throw new Error(`${file} does not import ../src/index.js`);
  writeFileSync(path.join(out, file), html.replaceAll('../src/index.js', './dist/gbif-components.js'));
}
console.log(`Demo site written to ${path.relative(root, out)}/`);
