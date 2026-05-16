import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { TAnalyzeArtifactInput, TAnalyzeArtifactOutput } from './types';
import {
  extractOffersFromHtml,
  findLinksByPattern,
  normalizePatterns,
  resolveUnmatchedShortLinks,
  resolveUnmatchedShortLinksViaChain,
} from './libs';
import type { TShortLinkResolveMode } from './types';

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

    const shortLinkResolveMode: TShortLinkResolveMode =
      input.shortLinkResolveMode ?? 'final';
    const resolveOptions = {
      patterns,
      timeoutMs: input.shortLinkTimeoutMs ?? 12_000,
      concurrency: input.shortLinkConcurrency ?? 8,
      maxHops: input.shortLinkMaxHops,
      requestHeaders: input.shortLinkRequestHeaders,
    };

    if (shortLinkResolveMode === 'chain') {
      const resolved = await resolveUnmatchedShortLinksViaChain(
        offers,
        resolveOptions,
      );
      return {
        artifactHtmlPath,
        patterns,
        shortLinkResolveMode,
        totalOffers: offers.length,
        directMatches,
        resolvedMatches: resolved.resolvedMatchedOffers,
        shortLinkResolutions: resolved.allResolved,
      };
    }

    const resolved = await resolveUnmatchedShortLinks(offers, resolveOptions);

    return {
      artifactHtmlPath,
      patterns,
      shortLinkResolveMode,
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
