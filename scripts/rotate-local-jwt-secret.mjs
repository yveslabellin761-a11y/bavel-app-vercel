import { randomBytes } from 'node:crypto';
import { chmod, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
const temporaryPath = `${envPath}.${process.pid}.tmp`;
const contents = await readFile(envPath, 'utf8');
const secretLines = contents.match(/^\s*(?:export\s+)?JWT_SECRET\s*=.*$/gm) || [];

if (secretLines.length !== 1) {
  console.error('Expected exactly one JWT_SECRET entry in .env. No changes were made.');
  process.exit(1);
}

const secret = randomBytes(48).toString('base64url');
const nextContents = contents.replace(/^\s*(?:export\s+)?JWT_SECRET\s*=.*$/m, `JWT_SECRET="${secret}"`);

try {
  await writeFile(temporaryPath, nextContents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await rename(temporaryPath, envPath);
  await chmod(envPath, 0o600);
} catch (error) {
  await unlink(temporaryPath).catch(() => {});
  throw error;
}

console.log('Generated and saved a new 48-byte JWT secret to the local .env. Secret value was not displayed.');
console.log(
  'Copy it privately to the backend deployment environment; rotating it invalidates tokens signed with the old secret.'
);
