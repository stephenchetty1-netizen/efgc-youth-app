// Build a self-contained web asset directory for Capacitor without changing the live Pages site.
// Run the existing approved image-generation scripts before invoking this script.
import { copyFile, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const root = resolve('.');
const web = join(root, 'www');
const assets = join(root, 'assets');
const files = await readdir(root, { withFileTypes: true });
const shell = files.filter((item) => item.isFile() && /\.(js|css)$/.test(item.name)).map((item) => item.name);
shell.push('index.html', 'manifest.webmanifest');

await rm(web, { recursive: true, force: true });
await mkdir(web, { recursive: true });
for (const name of shell) {
  await copyFile(join(root, name), join(web, name));
}

async function copyAssets(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.isDirectory()) await copyAssets(join(from, entry.name), join(to, entry.name));
    else if (entry.isFile() && !['.md', '.txt'].includes(extname(entry.name).toLowerCase())) {
      await copyFile(join(from, entry.name), join(to, entry.name));
    }
  }
}
await copyAssets(assets, join(web, 'assets'));

const html = await readFile(join(web, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(join(web, 'manifest.webmanifest'), 'utf8'));
const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1])
  .concat((manifest.icons || []).map((icon) => icon.src))
  .concat([
    'assets/v76-efgc-logo.png',
    'assets/v76-login-poster.webp',
    'assets/efgc-login-2026-09-20.webp',
    'assets/scripture-v74/youth-worship.jpg',
    'v63-duty-ack.js',
    'v63-duty-ack.css',
  ]);

let verified = 0;
for (const url of urls) {
  const relative = url.split(/[?#]/)[0];
  if (!relative || relative.startsWith('/') || /^(?:https?:|data:|#)/i.test(relative)) continue;
  const target = resolve(web, relative);
  if (!(target === web || target.startsWith(web + '/'))) throw new Error('Invalid asset path: ' + relative);
  if (!(await stat(target).catch(() => null))?.isFile()) throw new Error('Missing mobile asset: ' + relative);
  verified++;
}
console.log('EFGC mobile web assets ready: ' + shell.length + ' shell files and ' + verified + ' verified asset references.');
