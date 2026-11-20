import { createHash } from 'node:crypto';

export const sampleCover = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4cGfBfwAImANs4nbskQAAAABJRU5ErkJggg==',
  'base64',
);

export const sampleCoverChecksum = createHash('sha256')
  .update(sampleCover)
  .digest('hex');

export const sampleCoverMimeType = 'image/png';
