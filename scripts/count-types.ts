import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(entryPath);
    }
  }

  return files;
}

async function countOccurrences(files: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>([
    ['any', 0],
    ['unknown', 0]
  ]);

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    for (const key of counts.keys()) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        counts.set(key, counts.get(key)! + matches.length);
      }
    }
  }

  return counts;
}

async function main() {
  const files = await collectFiles(ROOT);
  const counts = await countOccurrences(files);

  for (const [key, value] of counts.entries()) {
    console.log(`${key}: ${value}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
