import { chmod, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
const requiredManualGroups = [
  {
    comment: '# Add the Upstash REST URL and token from your production Redis database.',
    entries: ['UPSTASH_REDIS_REST_URL=""', 'UPSTASH_REDIS_REST_TOKEN=""']
  },
  {
    comment: '# Add separate production DSNs from your Sentry server and browser projects.',
    entries: ['SENTRY_DSN=""', 'VITE_SENTRY_DSN=""']
  }
];

let contents;
try {
  contents = await readFile(envPath, 'utf8');
} catch (error) {
  console.error('Could not read .env. Create it from .env.example before preparing production variables.');
  process.exitCode = 1;
  throw error;
}

const existingNames = new Set(
  contents
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
    .filter(Boolean)
);
const cleanedLines = contents.split(/\r?\n/).filter((line) => !/^\s*(?:export\s+)?APP_URL\s*=/.test(line));
const obsoleteAppUrlRemoved = cleanedLines.length !== contents.split(/\r?\n/).length;
const additions = requiredManualGroups.flatMap(({ comment, entries }) => {
  const missingEntries = entries.filter((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    return match && !existingNames.has(match[1]);
  });
  return missingEntries.length ? [comment, ...missingEntries, ''] : [];
});

if (additions.length === 0 && !obsoleteAppUrlRemoved) {
  console.log('.env already has the requested variable entries. No values were displayed.');
} else {
  const nextContents = `${cleanedLines.join('\n').trimEnd()}\n${additions.length ? `\n${additions.join('\n')}` : ''}`;
  await writeFile(envPath, nextContents, 'utf8');
  console.log(
    'Updated .env with missing production variable entries and removed obsolete APP_URL. Existing values were preserved and not displayed.'
  );
}
await chmod(envPath, 0o600);
