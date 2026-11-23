import {
  CHAPTER_CONTENT_FORMAT_VERSION,
  createChapterVersion,
} from './chapter-version.writer.ts';
import { describe, expect, vi } from 'vitest';

const input = {
  chapterId: '11111111-1111-4111-8111-111111111111',
  editionId: '22222222-2222-4222-8222-222222222222',
  versionNumber: 2,
  title: 'Chapter One',
  html: '<p onclick="alert(1)">Hello</p>' + '<script>alert(1)</script>',
  editionSourceId: '33333333-3333-4333-8333-333333333333',
};

const expectedHtml = '<p id="p-1">Hello</p>';

const expectedHash =
  'd10eb451aa81fa3c63b2f9cadbd3dd0c14ad8edc383766fafad5fd8116fdd183';

function createClientMock() {
  const savedVersion = {
    id: '44444444-4444-4444-8444-4444444444444',
    chapterId: input.chapterId,
    editionId: input.editionId,
    versionNumber: input.versionNumber,
    title: input.title,
    contentHtml: expectedHtml,
    contentFormatVersion: CHAPTER_CONTENT_FORMAT_VERSION,
    editionSourceId: input.editionSourceId,
    contentHash: expectedHash,
    createdAt: new Date('2026-11-20T00:00:00.000Z'),
  };

  const create = vi.fn().mockResolvedValue(savedVersion);

  return {
    client: {
      chapterVersion: { create },
    },
    create,
    savedVersion,
  };
}

describe('createChapterVersion', () => {
  it('stores sanitized HTML and hashes the final content including anchors', async () => {
    const { client, create, savedVersion } = createClientMock();

    const result = await createChapterVersion(client, input);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        chapterId: input.chapterId,
        editionId: input.editionId,
        versionNumber: input.versionNumber,
        title: input.title,
        editionSourceId: input.editionSourceId,
        contentHtml: expectedHtml,
        contentHash: expectedHash,
        contentFormatVersion: 2,
      },
    });

    expect(result).toBe(savedVersion);
  });

  it('ignores caller-supplied storage fields outside the input contract', async () => {
    const { client, create } = createClientMock();

    const untrustedInput = {
      ...input,
      contentHtml: '<script>alert(1)</script>',
      contentHash: 'caller-controlled',
      contentFormatVersion: 999,
    };

    await createChapterVersion(client, untrustedInput);

    expect(create).toHaveBeenCalledWith({
      data: {
        chapterId: input.chapterId,
        editionId: input.editionId,
        versionNumber: input.versionNumber,
        title: input.title,
        editionSourceId: input.editionSourceId,
        contentHtml: expectedHtml,
        contentHash: expectedHash,
        contentFormatVersion: 2,
      },
    });
  });

  it('stores identical content and hash for equivalent sanitized input', async () => {
    const first = createClientMock();
    const second = createClientMock();

    await createChapterVersion(first.client, input);

    await createChapterVersion(second.client, {
      ...input,
      html: '<p id="caller-id">Hello</p>',
    });

    expect(first.create.mock.calls).toEqual(second.create.mock.calls);
  });

  it('propagates database errors without retrying with raw HTML', async () => {
    const { client, create } = createClientMock();
    const error = new Error('Database unavailable');

    create.mockRejectedValueOnce(error);

    await expect(createChapterVersion(client, input)).rejects.toThrow(
      'Database unavailable',
    );

    expect(create).toHaveBeenCalledTimes(1);
  });
});
