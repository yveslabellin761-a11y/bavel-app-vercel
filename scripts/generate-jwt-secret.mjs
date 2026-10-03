import { randomBytes } from 'node:crypto';

console.log(`JWT_SECRET=${randomBytes(48).toString('base64url')}`);
