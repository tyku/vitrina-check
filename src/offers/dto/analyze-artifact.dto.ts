import { z } from 'zod';

export const AnalyzeArtifactSchema = z.object({
  artifactHtmlPath: z.string().min(1, 'artifactHtmlPath is required'),
  patterns: z.array(z.string().min(1)).nonempty('patterns must not be empty'),
  resolveShortLinks: z.boolean().optional(),
  shortLinkTimeoutMs: z.number().int().min(1_000).max(120_000).optional(),
  shortLinkConcurrency: z.number().int().min(1).max(32).optional(),
});

export type TAnalyzeArtifactDto = z.infer<typeof AnalyzeArtifactSchema>;
