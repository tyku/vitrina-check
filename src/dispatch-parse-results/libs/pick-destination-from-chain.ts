import type { TRedirectHop } from '../../offers/types';
import {
  hostnameFromUrl,
  hostnameMatchesTagPatterns,
  isIntermediateRedirectHost,
} from './is-tracker-or-short-host';

export type TDestinationFromChain = {
  destinationHost?: string;
  destinationUrl?: string;
};

export function pickDestinationFromChain(
  chain: TRedirectHop[],
  patterns: string[],
): TDestinationFromChain {
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const hop = chain[index];
    if (!hop?.url) {
      continue;
    }

    const hostname = hostnameFromUrl(hop.url);
    if (!hostname) {
      continue;
    }

    if (isIntermediateRedirectHost(hostname)) {
      continue;
    }

    if (hostnameMatchesTagPatterns(hostname, patterns)) {
      continue;
    }

    return {
      destinationHost: hostname,
      destinationUrl: hostname,
    };
  }

  return {};
}
