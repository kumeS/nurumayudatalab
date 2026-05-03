import { normalizeItemUrl } from './sites.js';

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(text) {
  return decodeHtml(String(text || '').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

export function parse7net(html) {
  const oneline = String(html || '').replace(/[\r\n]/g, '');
  const blocks = oneline.split('<p class="productImg">').slice(1);
  const items = [];

  for (const block of blocks) {
    const m = block.match(/<p class="productName"><a href="([^"]*)"[^>]*>(.+?)<\/a><\/p>/);
    if (!m) continue;

    const url = normalizeItemUrl('7net', m[1]);
    const title = stripTags(m[2]);
    const priceMatch = block.match(/<span class="u-inTaxTxt">([0-9,.]+)<\/span>/);
    const price = priceMatch ? priceMatch[1].replace(/\.[0-9]+$/, '') : '';

    if (!title) continue;
    items.push({ title, url, price });
  }

  return items;
}

export function parseHmv(html) {
  const content = String(html || '');
  const titleMatches = [...content.matchAll(/<h3 class="title">[\s\S]*?<a href="([^"]*)">([\s\S]*?)<\/a>[\s\S]*?<\/h3>/g)];
  const priceMatches = [...content.matchAll(/<div class="right">￥([0-9,]+)<\/div>/g)].map((m) => m[1]);

  const items = [];
  for (let index = 0; index < titleMatches.length; index += 1) {
    const match = titleMatches[index];
    const url = normalizeItemUrl('hmv', match[1]);
    const title = stripTags(match[2]);
    if (!url || /^javascript:/i.test(url)) continue;
    if (!/\/item_|\/product\//.test(url) && !url.startsWith('http')) continue;
    const price = priceMatches[index] || '';
    if (!title) continue;
    items.push({ title, url, price });
  }

  return items;
}

export function parseAnimate(html) {
  const content = String(html || '');
  const titleMatches = [...content.matchAll(/<h3><a href="([^"]*)"[^>]*>([^<]+)<\/a><\/h3>/g)];
  const priceMatches = [...content.matchAll(/<p class="price"><font class="notranslate">([0-9,]+)<\/font>円/g)].map((m) => m[1]);

  const items = [];
  for (let index = 0; index < titleMatches.length; index += 1) {
    const match = titleMatches[index];
    const url = normalizeItemUrl('animate', match[1]);
    const title = stripTags(match[2]);
    const price = priceMatches[index] || '';
    if (!title) continue;
    items.push({ title, url, price });
  }

  return items;
}

export function parseRakuten(html) {
  const oneline = String(html || '').replace(/[\r\n]/g, '').replace(/>\s+</g, '><');
  const titleMatches = [...oneline.matchAll(/<a href="(https:\/\/books\.rakuten\.co\.jp\/rb\/[0-9]+\/[^"]*)"><span class="rbcomp__item-list__item__title">([^<]+)<\/span>/g)];
  const priceMatches = [...oneline.matchAll(/<span class="rbcomp__item-list__item__price"><em>([0-9,]+)円<\/em>/g)].map((m) => m[1]);

  const items = [];
  for (let index = 0; index < titleMatches.length; index += 1) {
    const match = titleMatches[index];
    const url = match[1];
    const title = stripTags(match[2]);
    const price = priceMatches[index] || '';
    if (!title) continue;
    items.push({ title, url, price });
  }

  return items;
}

export function parseSearchResult(site, html) {
  switch (site) {
    case '7net':
      return parse7net(html);
    case 'hmv':
      return parseHmv(html);
    case 'animate':
      return parseAnimate(html);
    case 'rakuten':
      return parseRakuten(html);
    default:
      return [];
  }
}
