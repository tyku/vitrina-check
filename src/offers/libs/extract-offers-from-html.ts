import { load, type CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type { TOfferLink } from '../types';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const BLOCK_SELECTOR = 'section, article, aside, main, div, ul, ol';
const OFFER_HINT_CLASS = /(offer|card|loan|mfo|product|item|list|top|promo)/i;

function makeSelectorTag($: CheerioAPI, el: Element): string {
  const tag = el.tagName;
  const id = $(el).attr('id');
  const classes = ($(el).attr('class') || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join('.');

  if (id) return `${tag}#${id}`;
  if (classes) return `${tag}.${classes}`;
  return tag;
}

function textOrEmpty(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function guessBlockName(
  $: CheerioAPI,
  element: Element,
): { blockName: string; blockSelector: string } {
  const blockNode = $(element).closest(BLOCK_SELECTOR).first();

  if (blockNode.length === 0) {
    return { blockName: 'unknown', blockSelector: 'unknown' };
  }

  const heading = blockNode.find(HEADING_SELECTOR).first().text();
  if (textOrEmpty(heading)) {
    return {
      blockName: textOrEmpty(heading),
      blockSelector: makeSelectorTag($, blockNode.get(0) as Element),
    };
  }

  const className = blockNode.attr('class') || '';
  const id = blockNode.attr('id') || '';
  const nameCandidate = [id, className]
    .map((part) => textOrEmpty(part))
    .filter((part) => part && OFFER_HINT_CLASS.test(part))[0];

  return {
    blockName: nameCandidate || 'block',
    blockSelector: makeSelectorTag($, blockNode.get(0) as Element),
  };
}

export function extractOffersFromHtml(html: string): TOfferLink[] {
  const $ = load(html);
  const anchors = $('a[href]').toArray();

  const rows: Omit<TOfferLink, 'positionInBlock'>[] = [];
  let positionOnPage = 0;

  for (const anchor of anchors) {
    const href = $(anchor).attr('href') || '';
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:')
    ) {
      continue;
    }

    let absoluteHref = href;
    try {
      if (href.startsWith('//')) {
        absoluteHref = `https:${href}`;
      } else if (href.startsWith('/')) {
        // Relative links are ignored for offer analysis.
        continue;
      }
      const parsed = new URL(absoluteHref);
      if (!parsed.protocol.startsWith('http')) continue;
      absoluteHref = parsed.toString();
    } catch {
      continue;
    }

    positionOnPage += 1;
    const anchorText = textOrEmpty($(anchor).text());
    const { blockName, blockSelector } = guessBlockName($, anchor);
    rows.push({
      href: absoluteHref,
      anchorText: anchorText || 'link',
      blockName,
      blockSelector,
      positionOnPage,
    });
  }

  const blockCounters = new Map<string, number>();
  return rows.map((row) => {
    const key = `${row.blockName}|${row.blockSelector}`;
    const next = (blockCounters.get(key) || 0) + 1;
    blockCounters.set(key, next);
    return { ...row, positionInBlock: next };
  });
}
