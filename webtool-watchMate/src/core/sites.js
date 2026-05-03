export function buildSearchUrl(site, keyword) {
  const encoded = encodeURIComponent(keyword);

  switch (site) {
    case '7net':
      return `https://7net.omni7.jp/search/?keyword=${encoded}`;
    case 'hmv':
      return `https://www.hmv.co.jp/search/adv_1/category_24/keyword_${encoded}/target_LBOOKS/type_sr/`;
    case 'animate':
      return `https://www.animate-onlineshop.jp/products/list.php?mode=search&smt=${encoded}`;
    case 'rakuten':
      return `https://books.rakuten.co.jp/search?sitem=${encoded}&g=007&l-id=search-l-genre-1`;
    default:
      throw new Error(`Unsupported site: ${site}`);
  }
}

export function normalizeItemUrl(site, rawUrl) {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;

  if (site === '7net') {
    if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
    if (rawUrl.startsWith('/')) return `https://7net.omni7.jp${rawUrl}`;
  }

  if (site === 'hmv' && rawUrl.startsWith('/')) {
    return `https://www.hmv.co.jp${rawUrl}`;
  }

  if (site === 'animate' && rawUrl.startsWith('/')) {
    return `https://www.animate-onlineshop.jp${rawUrl}`;
  }

  return rawUrl;
}
