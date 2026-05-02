import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { TAnalyzeArtifactInput, TAnalyzeArtifactOutput } from './types';
import {
  extractOffersFromHtml,
  findLinksByPattern,
  normalizePatterns,
  resolveUnmatchedShortLinks,
} from './libs';

@Injectable()
export class OffersArtifactAnalyzerService {
  async analyzeFromArtifacts(
    input: TAnalyzeArtifactInput,
  ): Promise<TAnalyzeArtifactOutput> {
    const patterns = normalizePatterns(input.patterns);
    const artifactHtmlPath = this.toAbsolutePath(input.artifactHtmlPath);
    const html = await readFile(artifactHtmlPath, 'utf-8');

    const offers = extractOffersFromHtml(html);
    const directMatches = findLinksByPattern(offers, patterns);

    if (!input.resolveShortLinks) {
      return {
        artifactHtmlPath,
        patterns,
        totalOffers: offers.length,
        directMatches,
        resolvedMatches: [],
      };
    }

    const resolved = await resolveUnmatchedShortLinks(offers, {
      patterns,
      timeoutMs: input.shortLinkTimeoutMs ?? 12_000,
      concurrency: input.shortLinkConcurrency ?? 8,
      requestHeaders: input.shortLinkRequestHeaders,
    });

    return {
      artifactHtmlPath,
      patterns,
      totalOffers: offers.length,
      directMatches,
      resolvedMatches: resolved.resolvedMatchedOffers,
      shortLinkResolutions: resolved.allResolved,
    };
  }

  private toAbsolutePath(inputPath: string): string {
    if (inputPath.startsWith('/')) {
      return inputPath;
    }
    return resolve(join(process.cwd(), inputPath));
  }
}
