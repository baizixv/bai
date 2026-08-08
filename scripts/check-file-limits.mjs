import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const limit = 300;
const extensions = new Set(['.astro', '.ts', '.css', '.md', '.mjs']);
const ignored = new Set(['node_modules', '.git', '.astro', 'dist', 'public']);
/** @type {string[]} */
const files = [];

/** @param {string} directory */
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extensions.has(path.slice(path.lastIndexOf('.')))) files.push(path);
  }
}

await walk(root);
const violations = [];
for (const path of files) {
  const lines = (await readFile(path, 'utf8')).split('\n').length;
  if (lines > limit) violations.push(`${relative(root, path)}: ${lines} lines (limit: ${limit})`);
}

if (violations.length) {
  console.error('File size limit exceeded:\n' + violations.join('\n'));
  process.exit(1);
}
console.log(`Structure check passed: ${files.length} source files, max ${limit} lines per file.`);
