import { z } from 'zod';

export const CapturePageSchema = z.object({
  url: z.string().url(),
  /** When set, HTML is saved as `${artifactId}.html` under artifacts (caller handles analysis and cleanup). */
  artifactId: z.string().min(1).max(64).optional(),
  retryCount: z.number().int().min(0).max(5).optional(),
  navigationTimeoutMs: z.number().int().min(5_000).max(180_000).optional(),
});

export type TCapturePageDto = z.infer<typeof CapturePageSchema>;
