import { open, stat } from 'node:fs/promises';
import { join } from 'node:path';

/** Same rules as Playwright `sanitizeArtifactBaseName` for `artifactId` filenames. */
export function sanitizeDispatchQueueIdForFilename(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return safe.length > 0 ? safe : 'artifact';
}

/** Path where Playwright saves HTML when `artifactId` is the queue item id (`${safe}.html`). */
export function dispatchQueueCaptureHtmlPath(
  artifactsRoot: string,
  queueItemId: string,
): string {
  const safe = sanitizeDispatchQueueIdForFilename(queueItemId);
  return join(artifactsRoot, `${safe}.html`);
}

/** Path after a successful post-capture rename (`page_${safe}.html`). */
export function dispatchQueuePageHtmlPath(
  artifactsRoot: string,
  queueItemId: string,
): string {
  const safe = sanitizeDispatchQueueIdForFilename(queueItemId);
  return join(artifactsRoot, `page_${safe}.html`);
}

export const DEFAULT_MIN_HTML_ARTIFACT_BYTES = 256;

export type TUsableHtmlArtifactCheckOptions = {
  /** Minimum file size in bytes (truncated / empty captures fail). */
  minBytes?: number;
};

/**
 * Returns true if the path is a regular file, large enough, and starts like HTML after trim.
 */
export async function isUsableHtmlArtifactFile(
  absolutePath: string,
  options?: TUsableHtmlArtifactCheckOptions,
): Promise<boolean> {
  const minBytes = options?.minBytes ?? DEFAULT_MIN_HTML_ARTIFACT_BYTES;
  try {
    const s = await stat(absolutePath);
    if (!s.isFile()) {
      return false;
    }
    if (s.size < minBytes) {
      return false;
    }

    const headSize = Math.min(4096, s.size);
    const fh = await open(absolutePath, 'r');
    try {
      const buf = Buffer.alloc(headSize);
      const { bytesRead } = await fh.read(buf, 0, headSize, 0);
      const head = buf.subarray(0, bytesRead).toString('utf-8').trimStart();
      if (!head.startsWith('<')) {
        return false;
      }
    } finally {
      await fh.close();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Picks an existing HTML artifact for a queue item, if any is usable for analysis retry.
 * Order: fresh capture filename first, then renamed `page_*.html` from a prior partial run.
 */
export async function getExistingUsableDispatchQueueHtmlPath(params: {
  artifactsRoot: string;
  queueItemId: string;
  minBytes?: number;
}): Promise<string | null> {
  const checkOpts: TUsableHtmlArtifactCheckOptions = {
    minBytes: params.minBytes,
  };
  const candidates = [
    dispatchQueueCaptureHtmlPath(params.artifactsRoot, params.queueItemId),
    dispatchQueuePageHtmlPath(params.artifactsRoot, params.queueItemId),
  ];
  for (const candidate of candidates) {
    if (await isUsableHtmlArtifactFile(candidate, checkOpts)) {
      return candidate;
    }
  }
  return null;
}
