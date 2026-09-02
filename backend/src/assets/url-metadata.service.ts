import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export interface UrlMetadata {
  url: string;
  title: string | null;
  description: string | null;
  /** og:image, twitter:image, or the site favicon — whichever is found first. */
  previewUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  /** Hostname with a leading `www.` stripped, e.g. `figma.com`. */
  domain: string;
  contentType: string | null;
}

/**
 * Fetches title / preview / favicon for a pasted URL.
 *
 * Every failure mode here is non-fatal by design: an import must still succeed
 * when the target site is slow, blocks scrapers, or serves no metadata. Callers
 * get whatever could be read and fall back to the domain name for the title.
 */
@Injectable()
export class UrlMetadataService {
  private readonly logger = new Logger(UrlMetadataService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Validates a user-supplied URL before anything fetches it.
   *
   * The server is about to make a request to an address the user chose, so this
   * rejects non-HTTP schemes and any host that resolves into a private,
   * loopback, link-local or carrier-grade-NAT range. Without it, `/assets/from-url`
   * is an SSRF probe into whatever network this API runs in.
   */
  async assertFetchable(rawUrl: string): Promise<URL> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('That is not a valid URL.');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Only http and https URLs can be imported.');
    }

    const host = parsed.hostname;
    const addresses: string[] = [];

    if (isIP(host)) {
      addresses.push(host);
    } else {
      try {
        const resolved = await lookup(host, { all: true });
        addresses.push(...resolved.map((entry) => entry.address));
      } catch {
        throw new BadRequestException(`Could not resolve ${host}.`);
      }
    }

    if (addresses.some((address) => this.isPrivateAddress(address))) {
      throw new BadRequestException('That URL points at a private network address.');
    }

    return parsed;
  }

  private isPrivateAddress(address: string): boolean {
    if (isIP(address) === 6) {
      const normalized = address.toLowerCase();
      return (
        normalized === '::1' ||
        normalized === '::' ||
        normalized.startsWith('fc') || // unique local
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80') || // link local
        normalized.startsWith('::ffff:') // IPv4-mapped; re-checked below
      );
    }

    const octets = address.split('.').map((part) => Number.parseInt(part, 10));
    if (octets.length !== 4 || octets.some(Number.isNaN)) {
      return true;
    }
    const [a, b] = octets;

    return (
      a === 0 || // "this network"
      a === 10 || // private
      a === 127 || // loopback
      (a === 169 && b === 254) || // link local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) || // private
      (a === 192 && b === 168) || // private
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      a >= 224 // multicast and reserved
    );
  }

  /**
   * Best-effort metadata scrape. Never throws for a fetch or parse failure — it
   * returns the domain-only fallback instead, so an import is never blocked by an
   * uncooperative website.
   */
  async fetch(rawUrl: string): Promise<UrlMetadata> {
    const url = await this.assertFetchable(rawUrl);
    const fallback = this.emptyMetadata(url);

    try {
      const response = await axios.get<string>(url.toString(), {
        timeout: this.config.get<number>('urlImport.timeoutMs', 8000),
        maxContentLength: this.config.get<number>('urlImport.maxBytes', 1024 * 1024),
        maxRedirects: 5,
        responseType: 'text',
        // Many sites serve a stub or a 403 to an unrecognised agent.
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; CreatorsVaultBot/1.0; +https://creatorsvault.app/bot)',
          Accept: 'text/html,application/xhtml+xml',
        },
        validateStatus: (status) => status < 400,
      });

      const contentType = String(response.headers['content-type'] ?? '') || null;
      if (contentType && !contentType.includes('html')) {
        // A direct link to an image or a PDF: no HTML to parse, but the content
        // type is still worth recording.
        return { ...fallback, contentType };
      }

      return { ...this.parseHtml(response.data, url), contentType };
    } catch (error) {
      this.logger.warn(`Metadata fetch failed for ${url.hostname}: ${(error as Error).message}`);
      return fallback;
    }
  }

  private emptyMetadata(url: URL): UrlMetadata {
    return {
      url: url.toString(),
      title: null,
      description: null,
      previewUrl: null,
      faviconUrl: null,
      siteName: null,
      domain: url.hostname.replace(/^www\./, ''),
      contentType: null,
    };
  }

  private parseHtml(html: string, url: URL): UrlMetadata {
    const $ = cheerio.load(html);

    const meta = (selector: string): string | null => {
      const value = $(selector).attr('content');
      return value?.trim() || null;
    };

    const absolute = (href: string | null | undefined): string | null => {
      if (!href) {
        return null;
      }
      try {
        return new URL(href, url).toString();
      } catch {
        return null;
      }
    };

    const favicon =
      absolute($('link[rel="icon"]').attr('href')) ??
      absolute($('link[rel="shortcut icon"]').attr('href')) ??
      absolute($('link[rel="apple-touch-icon"]').attr('href')) ??
      absolute('/favicon.ico');

    const preview =
      absolute(meta('meta[property="og:image"]')) ??
      absolute(meta('meta[name="twitter:image"]')) ??
      favicon;

    return {
      url: url.toString(),
      title:
        meta('meta[property="og:title"]') ??
        meta('meta[name="twitter:title"]') ??
        ($('title').first().text().trim() || null),
      description:
        meta('meta[property="og:description"]') ??
        meta('meta[name="description"]') ??
        meta('meta[name="twitter:description"]'),
      previewUrl: preview,
      faviconUrl: favicon,
      siteName: meta('meta[property="og:site_name"]'),
      domain: url.hostname.replace(/^www\./, ''),
      contentType: null,
    };
  }
}
