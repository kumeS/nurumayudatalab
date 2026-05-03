import { SITE_LABELS, selectedSites } from './models.js';
import { buildSearchUrl } from './sites.js';
import { parseSearchResult } from './parsers.js';
import { detectSalesStatusFromHtml } from './status.js';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function createFetchClient({ fetchImpl = fetch, timeoutMs = 30000, retries = 2, userAgent = DEFAULT_USER_AGENT } = {}) {
  function decodeHtmlFromResponse(response, bytes) {
    const contentType = response.headers.get('content-type') || '';
    const asciiProbe = new TextDecoder('latin1').decode(bytes.slice(0, 4096));
    const charsetFromHeader = contentType.match(/charset=([^;\s]+)/i)?.[1]?.toLowerCase() || '';
    const charsetFromMeta = asciiProbe.match(/charset\s*=\s*['"]?([a-zA-Z0-9_-]+)/i)?.[1]?.toLowerCase() || '';
    const charset = charsetFromHeader || charsetFromMeta;

    if (charset.includes('shift_jis') || charset.includes('sjis') || charset.includes('cp932')) {
      try {
        return new TextDecoder('shift_jis').decode(bytes);
      } catch {
        return new TextDecoder('utf-8').decode(bytes);
      }
    }

    return new TextDecoder('utf-8').decode(bytes);
  }

  async function fetchText(url) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        return decodeHtmlFromResponse(response, bytes);
      } catch (error) {
        clearTimeout(timer);
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  return { fetchText };
}

export async function searchSite({ site, keyword, maxResults, productFilter = '', fetchClient }) {
  const searchUrl = buildSearchUrl(site, keyword);
  const searchHtml = await fetchClient.fetchText(searchUrl);

  let items = parseSearchResult(site, searchHtml);
  if (productFilter) {
    items = items.filter((item) => item.title.includes(productFilter));
  }

  const limited = items.slice(0, maxResults);
  const timestamp = new Date().toISOString();

  const records = [];
  for (const item of limited) {
    let status = '判定不可';

    try {
      const detailHtml = await fetchClient.fetchText(item.url);
      status = detectSalesStatusFromHtml(detailHtml);
    } catch {
      status = '判定不可';
    }

    records.push({
      timestamp,
      keyword,
      site,
      title: item.title,
      price: item.price || '',
      url: item.url,
      status
    });
  }

  return {
    site,
    siteLabel: SITE_LABELS[site],
    searchUrl,
    records
  };
}

export async function searchAll({ keyword, site = 'all', maxResults = 10, productFilter = '', fetchClient }) {
  const sites = selectedSites(site);
  const results = [];

  for (const siteKey of sites) {
    try {
      const result = await searchSite({
        site: siteKey,
        keyword,
        maxResults,
        productFilter,
        fetchClient
      });
      results.push(result);
    } catch (error) {
      results.push({
        site: siteKey,
        siteLabel: SITE_LABELS[siteKey],
        searchUrl: buildSearchUrl(siteKey, keyword),
        error: error instanceof Error ? error.message : String(error),
        records: []
      });
    }
  }

  return results;
}
