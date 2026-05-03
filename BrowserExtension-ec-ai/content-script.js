function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeLogDetails(details) {
  if (details === null || details === undefined) {
    return null;
  }
  if (typeof details === "string") {
    return details;
  }
  try {
    return JSON.parse(JSON.stringify(details));
  } catch (_error) {
    return String(details);
  }
}

function sendDebugLog(level, message, details) {
  try {
    chrome.runtime.sendMessage(
      {
        type: "ADD_DEBUG_LOG",
        payload: {
          level,
          source: "content-script",
          message,
          details: normalizeLogDetails({
            ...details,
            pageUrl: window.location.href
          })
        }
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  } catch (_error) {
    // Ignore logging failures in content script.
  }
}

window.addEventListener("error", (event) => {
  sendDebugLog("error", "window error", {
    message: event.message || "",
    filename: event.filename || "",
    lineno: event.lineno || 0,
    colno: event.colno || 0
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  sendDebugLog("error", "window unhandled rejection", {
    reason: reason && reason.message ? reason.message : String(reason || "")
  });
});

sendDebugLog("info", "content-script loaded", {
  hostname: window.location.hostname
});

function getBodyText() {
  return normalizeText(document.body ? document.body.innerText : "");
}

function getBodyLines() {
  const text = document.body ? document.body.innerText : "";
  return text
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function pickText(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }

    const value = normalizeText(element.textContent || "");
    if (value) {
      return value;
    }
  }
  return "";
}

function pickMeta(metaSelectors) {
  for (const selector of metaSelectors) {
    const element = document.querySelector(selector);
    const value = normalizeText(element && element.content);
    if (value) {
      return value;
    }
  }
  return "";
}

function parseJsonSafely(raw) {
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function pickJsonValueByKeys(keys) {
  const scripts = document.querySelectorAll('script[type="application/json"], script[type="text/plain"], script:not([src])');
  const joined = keys.join("|");
  const pattern = new RegExp(`\\"(${joined})\\"\\s*:\\s*\\"([^\\"]{2,300})\\"`, "ig");

  for (const script of scripts) {
    const text = script.textContent || "";
    if (!text || text.length < 50) {
      continue;
    }

    let match = null;
    while ((match = pattern.exec(text)) !== null) {
      const value = normalizeText(match[2]);
      if (value) {
        return value;
      }
    }
  }

  return "";
}

function getInlineScriptContents() {
  const scripts = document.querySelectorAll("script:not([src])");
  const contents = [];

  for (const script of scripts) {
    const text = script.textContent || "";
    if (text.length >= 80) {
      contents.push(text);
    }
  }

  return contents;
}

function extractJsonArrayFromInline(startKey, endKeys) {
  const contents = getInlineScriptContents();
  for (const text of contents) {
    if (!text.includes(`\"${startKey}\"`)) {
      continue;
    }

    for (const endKey of endKeys) {
      const pattern = new RegExp(`\\"${startKey}\\"\\s*:\\s*(\\[[\\s\\S]*?\\])\\s*,\\s*\\"${endKey}\\"\\s*:`, "m");
      const match = text.match(pattern);
      if (!match || !match[1]) {
        continue;
      }

      const parsed = parseJsonSafely(match[1]);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  }

  return [];
}

function extractJsonObjectFromInline(startKey, endKeys) {
  const contents = getInlineScriptContents();
  for (const text of contents) {
    if (!text.includes(`\"${startKey}\"`)) {
      continue;
    }

    for (const endKey of endKeys) {
      const pattern = new RegExp(`\\"${startKey}\\"\\s*:\\s*(\\{[\\s\\S]*?\\})\\s*,\\s*\\"${endKey}\\"\\s*:`, "m");
      const match = text.match(pattern);
      if (!match || !match[1]) {
        continue;
      }

      const parsed = parseJsonSafely(match[1]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function toArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function collectJsonLdProducts() {
  const products = [];
  const nodes = document.querySelectorAll('script[type="application/ld+json"]');

  for (const node of nodes) {
    const parsed = parseJsonSafely(node.textContent || "");
    if (!parsed) {
      continue;
    }

    const candidates = [];
    if (Array.isArray(parsed)) {
      candidates.push(...parsed);
    } else {
      candidates.push(parsed);
      if (Array.isArray(parsed["@graph"])) {
        candidates.push(...parsed["@graph"]);
      }
    }

    for (const item of candidates) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const typeValue = normalizeText(item["@type"]);
      if (/product/i.test(typeValue)) {
        products.push(item);
      }
    }
  }

  return products;
}

function findImages(jsonLdProducts) {
  const urls = new Set();

  const ogImage = pickMeta(['meta[property="og:image"]', 'meta[name="og:image"]']);
  if (ogImage) {
    urls.add(ogImage);
  }

  for (const item of jsonLdProducts) {
    for (const url of toArray(item.image)) {
      const normalized = normalizeText(url);
      if (/^https?:\/\//i.test(normalized)) {
        urls.add(normalized);
      }
    }
  }

  const imageNodes = document.querySelectorAll("img");
  for (const img of imageNodes) {
    const candidates = [
      img.currentSrc,
      img.src,
      img.getAttribute("data-src"),
      img.getAttribute("data-lazy-src")
    ];

    for (const candidate of candidates) {
      const src = normalizeText(candidate);
      if (/^https?:\/\//i.test(src)) {
        urls.add(src);
      }
    }

    if (urls.size >= 20) {
      break;
    }
  }

  const imageExtPattern = /\.webp(?:$|[?#_])/i;
  return Array.from(urls)
    .filter((url) => imageExtPattern.test(url))
    .slice(0, 20);
}

function extractWebpUrlsFromText(text) {
  if (!text) {
    return [];
  }

  const matches = text.match(/https?:\/\/[^\s"'<>]+?\.webp(?:[?#][^\s"'<>]*)?/ig) || [];
  return matches.map((value) => normalizeText(value));
}

function findDetailImages() {
  const selectors = [
    "#desc-lazyload-container img",
    "#mod-detail-description img",
    ".detail-content img",
    "[id*='detail'] img",
    "[class*='detail'] img"
  ];
  const urls = new Set();
  const imageExtPattern = /\.webp(?:$|[?#_])/i;

  for (const selector of selectors) {
    const nodes = document.querySelectorAll(selector);
    for (const node of nodes) {
      const candidates = [
        node.currentSrc,
        node.src,
        node.getAttribute("data-src"),
        node.getAttribute("data-lazy-src")
      ];
      for (const candidate of candidates) {
        const url = normalizeText(candidate);
        if (/^https?:\/\//i.test(url) && imageExtPattern.test(url)) {
          urls.add(url);
        }
      }
      if (urls.size >= 40) {
        return Array.from(urls).slice(0, 40);
      }
    }
  }

  // Fallback 1: prioritize URLs around 商品详情 / 宝贝详情 / 包装信息 in raw HTML.
  const html = document.documentElement ? document.documentElement.innerHTML : "";
  const sectionRegex = /(商品详情|宝贝详情|产品详情|包装信息)[\s\S]{0,20000}/g;
  let sectionMatch = null;
  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    for (const url of extractWebpUrlsFromText(sectionMatch[0])) {
      if (imageExtPattern.test(url)) {
        urls.add(url);
      }
      if (urls.size >= 40) {
        break;
      }
    }
    if (urls.size >= 40) {
      break;
    }
  }

  // Fallback 2: if still empty, scan the full page HTML.
  if (!urls.size) {
    for (const url of extractWebpUrlsFromText(html)) {
      if (imageExtPattern.test(url)) {
        urls.add(url);
      }
      if (urls.size >= 40) {
        break;
      }
    }
  }

  return Array.from(urls).slice(0, 40);
}

function findAttributes() {
  const rows = [];
  const seen = new Set();

  const pushAttribute = (rawKey, rawValue) => {
    const key = normalizeText(rawKey);
    const value = normalizeText(rawValue);
    const uniqueKey = `${key}::${value}`;
    if (!key || !value || seen.has(uniqueKey)) {
      return;
    }
    seen.add(uniqueKey);
    rows.push({ key, value });
  };

  const featureAttributes = extractJsonArrayFromInline("featureAttributes", ["imageList", "leafCategoryId"]);
  for (const item of featureAttributes) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const value = item.value || (Array.isArray(item.values) ? item.values.join(",") : "");
    pushAttribute(item.name, value);
    if (rows.length >= 40) {
      return rows;
    }
  }

  const idatacenterAttrs = extractJsonObjectFromInline("offerIDatacenterSellInfo", ["offerId", "offerPriceModel", "priceDisplay"]);
  if (idatacenterAttrs) {
    for (const [key, value] of Object.entries(idatacenterAttrs)) {
      if (key === "sellPointModel") {
        continue;
      }
      pushAttribute(key, String(value));
      if (rows.length >= 40) {
        return rows;
      }
    }
  }

  const skuProps = extractJsonArrayFromInline("skuProps", ["status", "subject", "topCategoryId"]);
  for (const prop of skuProps) {
    const key = normalizeText(prop && (prop.prop || prop.name));
    const values = Array.isArray(prop && prop.value)
      ? prop.value.map((entry) => normalizeText(entry && (entry.name || entry.value))).filter(Boolean)
      : [];
    if (key && values.length) {
      pushAttribute(key, values.join(","));
      if (rows.length >= 40) {
        return rows;
      }
    }
  }

  const selectors = [
    ".od-pc-attribute table tr",
    ".module-attrs table tr",
    "#mod-detail-attributes tr",
    "table tr"
  ];

  for (const selector of selectors) {
    const rowNodes = document.querySelectorAll(selector);
    for (const row of rowNodes) {
      const cells = row.querySelectorAll("th, td");
      if (cells.length < 2) {
        continue;
      }

      pushAttribute(cells[0].textContent || "", cells[1].textContent || "");

      if (rows.length >= 40) {
        return rows;
      }
    }
    if (rows.length) {
      return rows;
    }
  }

  const dlRows = document.querySelectorAll("dl, li");
  for (const row of dlRows) {
    const text = normalizeText(row.textContent || "");
    const match = text.match(/^([^:：]{1,30})[:：]\s*(.{1,120})$/);
    if (!match) {
      continue;
    }

    pushAttribute(match[1], match[2]);
    if (rows.length >= 40) {
      break;
    }
  }

  return rows;
}

function extractTokenList(text) {
  return text
    .split(/[\/,|;，、]/)
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .slice(0, 30);
}

function findVariants() {
  const fullText = getBodyText();
  const colors = [];
  const sizes = [];
  const skus = [];

  const skuProps = extractJsonArrayFromInline("skuProps", ["status", "subject", "topCategoryId"]);
  for (const prop of skuProps) {
    if (!prop || typeof prop !== "object") {
      continue;
    }

    const propName = normalizeText(prop.prop || prop.name);
    const values = Array.isArray(prop.value)
      ? prop.value.map((entry) => normalizeText(entry && (entry.name || entry.value))).filter(Boolean)
      : [];

    if (/颜色|顏色|color/i.test(propName)) {
      colors.push(...values);
    }
    if (/尺码|尺寸|size/i.test(propName)) {
      sizes.push(...values);
    }
  }

  const skuMap = extractJsonArrayFromInline("skuMap", ["skuTradeSupported", "supportWirelessOnly", "tradeWithoutPromotion"]);
  for (const item of skuMap) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const specRaw = normalizeText(String(item.specAttrs || "")).replace(/&gt;/g, ">");
    const specParts = specRaw.split(">").map((part) => normalizeText(part)).filter(Boolean);
    const color = specParts[0] || "";
    const size = specParts[1] || "";
    const stock = Number.isFinite(Number(item.canBookCount)) ? Number(item.canBookCount) : null;
    const priceValue = normalizeText(item.discountPrice || item.price || "");
    const price = priceValue ? (priceValue.startsWith("¥") ? priceValue : `¥${priceValue}`) : "";

    if (color) {
      colors.push(color);
    }
    if (size) {
      sizes.push(size);
    }

    if (color || size || price || stock !== null) {
      skus.push({
        color,
        size,
        price,
        stock
      });
    }

    if (skus.length >= 100) {
      break;
    }
  }

  const colorMatch = fullText.match(/(Color|Colours?|颜色|顏色|カラー)[:：]\s*([^\n]{1,200})/i);
  if (colorMatch && colorMatch[2]) {
    colors.push(...extractTokenList(colorMatch[2]));
  }

  const sizeMatch = fullText.match(/(Size|尺寸|尺码|サイズ)[:：]\s*([^\n]{1,200})/i);
  if (sizeMatch && sizeMatch[2]) {
    sizes.push(...extractTokenList(sizeMatch[2]));
  }

  const optionNodes = document.querySelectorAll("[data-sku], .sku-item, .sku-attr, .spec-item, [class*='sku']");
  for (const node of optionNodes) {
    const text = normalizeText(node.textContent || "");
    if (!text || text.length > 40) {
      continue;
    }

    if (/(cm|mm|inch|in|xl|xxl|xxxl|s|m|l|\d{2,3})/i.test(text)) {
      sizes.push(text);
    } else {
      colors.push(text);
    }
  }

  const lines = getBodyLines();
  let currentColor = "";
  let currentSize = "";
  let currentPrice = "";
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (/^颜色|^顏色/i.test(line) && lines[i + 1]) {
      currentColor = normalizeText(lines[i + 1]);
      if (currentColor) {
        colors.push(currentColor);
      }
      continue;
    }

    if (/尺码|尺寸|Size/i.test(line) && lines[i + 1]) {
      const maybeSize = normalizeText(lines[i + 1]);
      if (maybeSize && maybeSize.length <= 60) {
        sizes.push(maybeSize);
      }
    }

    if (/^¥\s*\d+(?:\.\d+)?$/.test(line)) {
      currentPrice = line;
      continue;
    }

    if (/库存\d+件/.test(line)) {
      const stockMatch = line.match(/库存\s*(\d+)件/);
      const stock = stockMatch && stockMatch[1] ? Number(stockMatch[1]) : null;
      const prev = normalizeText(lines[i - 1] || "");
      const optionName = /适合\d+-\d+斤|^[SMLX\d]/i.test(prev) ? prev : currentSize || prev;

      skus.push({
        color: currentColor || "",
        size: optionName || "",
        price: currentPrice || "",
        stock
      });
      if (optionName) {
        sizes.push(optionName);
      }
    }
  }

  return {
    colors: Array.from(new Set(colors)).slice(0, 20),
    sizes: Array.from(new Set(sizes)).slice(0, 40),
    skus: skus.slice(0, 100)
  };
}

function findTextByRegex(regex) {
  const text = document.body ? document.body.innerText : "";
  const match = text.match(regex);
  return match && match[1] ? normalizeText(match[1]) : "";
}

function findPriceTiers() {
  const structuredRanges = extractJsonArrayFromInline("offerPriceRanges", ["offerMinPrice", "canBookedAmountOriginal", "priceBeforeText"]);
  if (structuredRanges.length) {
    const tiers = structuredRanges
      .map((range) => {
        if (!range || typeof range !== "object") {
          return null;
        }

        const rawPrice = normalizeText(range.discountPrice || range.price || "");
        if (!rawPrice) {
          return null;
        }

        const price = rawPrice.startsWith("¥") ? rawPrice : `¥${rawPrice}`;
        const beginAmount = Number(range.beginAmount || 0);
        const endAmount = Number(range.endAmount || 0);
        let quantity = "";
        if (beginAmount > 0 && endAmount > 0) {
          quantity = `${beginAmount}-${endAmount}件`;
        } else if (beginAmount > 0) {
          quantity = `≥${beginAmount}件`;
        }

        return { price, quantity };
      })
      .filter(Boolean)
      .slice(0, 10);

    if (tiers.length) {
      return tiers;
    }
  }

  const lines = getBodyLines();
  const tiers = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const priceMatch = line.match(/¥\s*\d+(?:\.\d+)?/g);
    if (!priceMatch || !priceMatch.length) {
      continue;
    }

    const price = normalizeText(priceMatch[0]);
    const sameLineQty = line.match(/(\d+件起批|\d+-\d+件|≥\d+件|\d+件以上)/);
    const nextLine = normalizeText(lines[i + 1] || "");
    const nextLineQty = nextLine.match(/(\d+件起批|\d+-\d+件|≥\d+件|\d+件以上)/);
    const quantity = (sameLineQty && sameLineQty[1]) || (nextLineQty && nextLineQty[1]) || "";

    tiers.push({ price, quantity });
    if (tiers.length >= 10) {
      break;
    }
  }

  return tiers;
}

function deriveProductId(jsonLdProducts) {
  const href = window.location.href;
  const patterns = [
    /offer\/(\d+)\.html/i,
    /detail\/(\d+)\.html/i,
    /[?&]id=(\d{8,})/i
  ];

  for (const pattern of patterns) {
    const match = href.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  for (const item of jsonLdProducts) {
    const id = normalizeText(item.productID || item.sku || item.mpn);
    if (/^\d{6,}$/.test(id)) {
      return id;
    }
  }

  const html = document.documentElement ? document.documentElement.innerHTML : "";
  const inlineMatch = html.match(/"(?:offerId|productId|itemId)"\s*:\s*"?(\d{8,})"?/i);
  return inlineMatch && inlineMatch[1] ? inlineMatch[1] : "";
}

function findTitle(jsonLdProducts) {
  const scriptTitle = pickJsonValueByKeys(["subject", "offerTitle", "itemTitle"]);
  if (scriptTitle) {
    return scriptTitle;
  }

  const domTitle = pickText([
    ".d-title",
    ".module-title h1",
    ".od-pc-offer-title",
    ".od-pc-offer-title-text",
    "[class*='offer-title']",
    "[class*='product-title']",
    "[data-testid='product-title']",
    "h1"
  ]);
  if (domTitle) {
    return domTitle;
  }

  for (const item of jsonLdProducts) {
    const name = normalizeText(item.name);
    if (name) {
      return name;
    }
  }

  const ogTitle = pickMeta(['meta[property="og:title"]']);
  if (ogTitle) {
    return ogTitle;
  }

  const fallbackScriptTitle = pickJsonValueByKeys(["title", "name"]);
  if (fallbackScriptTitle) {
    return fallbackScriptTitle;
  }

  return normalizeText(document.title || "");
}

function findPrice(jsonLdProducts) {
  // 1. contextData from window.context priority
  const contextData = getContextData();
  if (contextData) {
    const offer = contextData.offer || contextData.productInfo || {};
    if (offer.discountPrice) return `¥${offer.discountPrice}`;
    if (offer.price) return `¥${offer.price}`;
  }

  // 2. DOM price selectors
  const domPrice = pickText([
    ".price-now",
    ".price .value",
    "[data-testid='price']",
    ".od-pc-offer-price",
    "[class*='price']"
  ]);

  if (domPrice && !/SKUリスト|sku list/i.test(domPrice)) {
    const cleanMatch = domPrice.match(/¥\s*([\d.]+(?:\.\d+)?)/);
    if (cleanMatch) return `¥${cleanMatch[1]}`;
  }

  // 3. JSON-LD offers
  for (const item of jsonLdProducts) {
    const offers = toArray(item.offers);
    for (const offer of offers) {
      const amount = normalizeText(offer && (offer.price || offer.lowPrice || offer.highPrice));
      if (amount && /^\d+(\.\d+)?$/.test(amount)) return `¥${amount}`;
    }
  }

  // 4. From body text, find most common price
  const bodyText = document.body ? document.body.innerText : "";
  const priceMatches = bodyText.match(/¥\s*([\d.]+(?:\.\d+)?)/g);
  if (priceMatches && priceMatches.length) {
    // Filter and sort by frequency, pick the most reasonable price
    const prices = priceMatches.map(m => m.match(/¥\s*([\d.]+)/)[1]).filter(p => parseFloat(p) > 0.1);
    const priceMap = {};
    prices.forEach(p => priceMap[p] = (priceMap[p] || 0) + 1);
    const sortedPrices = Object.keys(priceMap).sort((a,b) => priceMap[b] - priceMap[a]);
    if (sortedPrices.length) return `¥${sortedPrices[0]}`;
  }

  // 5. Fallback to price tiers (filter out unreasonable prices)
  const tiers = findPriceTiers().filter(t => {
    const num = parseFloat(t.price.replace(/¥/, ''));
    return num > 0.1 && num < 10000;
  });

  if (tiers.length) {
    // Use the most common price from tiers
    const tierPrices = tiers.map(t => t.price.replace(/¥/, ''));
    const tierMap = {};
    tierPrices.forEach(p => tierMap[p] = (tierMap[p] || 0) + 1);
    const sortedTierPrices = Object.keys(tierMap).sort((a,b) => tierMap[b] - tierMap[a]);
    return `¥${sortedTierPrices[0]}`;
  }

  return "";
}

function findMoq() {
  const domMoq = pickText([
    ".moq",
    ".minimum-order",
    ".od-pc-offer-minorder",
    "[class*='moq']",
    "[class*='min-order']"
  ]);
  if (domMoq) {
    return domMoq;
  }

  return findTextByRegex(/(?:MOQ|起订量|最小起订量|最小起批量)\s*[:：]?\s*([^\n]{1,80})/i);
}

function findSeller(jsonLdProducts) {
  const scriptSeller = pickJsonValueByKeys(["companyName", "authCompanyName", "sellerName", "shopName"]);
  if (scriptSeller) {
    return scriptSeller;
  }

  const domSeller = pickText([
    ".company-name",
    ".seller-name",
    ".od-pc-supplier-name",
    "[class*='supplier']",
    "[class*='seller']"
  ]);
  if (domSeller) {
    return domSeller;
  }

  for (const item of jsonLdProducts) {
    const brand = item.brand;
    if (typeof brand === "string") {
      const value = normalizeText(brand);
      if (value) {
        return value;
      }
    }

    if (brand && typeof brand === "object") {
      const value = normalizeText(brand.name);
      if (value) {
        return value;
      }
    }
  }

  return "";
}

function findShopInfo(jsonLdProducts) {
  const text = document.body ? document.body.innerText : "";
  const lines = getBodyLines();

  const fromDomName = findSeller(jsonLdProducts) || pickText([
    ".company-name",
    ".supplier-name",
    ".od-pc-supplier-name",
    "[class*='company']"
  ]);

  let yearsOnPlatform = "";
  let region = "";
  let repeatPurchaseRate = "";
  let certificateInfo = "";
  const badges = [];
  const serviceScores = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!yearsOnPlatform) {
      const yearsMatch = line.match(/(\d+年)/);
      if (yearsMatch && yearsMatch[1]) {
        yearsOnPlatform = yearsMatch[1];
      }
    }

    if (!region) {
      const regionMatch = line.match(/^所在地区\s*(.+)$/);
      if (regionMatch && regionMatch[1]) {
        region = normalizeText(regionMatch[1]);
      } else if (line === "所在地区" && lines[i + 1]) {
        region = normalizeText(lines[i + 1]);
      }
    }

    if (!repeatPurchaseRate) {
      const repeatMatch = line.match(/^回头率\s*(\d+%)/);
      if (repeatMatch && repeatMatch[1]) {
        repeatPurchaseRate = repeatMatch[1];
      } else if (line === "回头率" && lines[i + 1]) {
        const nextRate = normalizeText(lines[i + 1]);
        if (/^\d+%$/.test(nextRate)) {
          repeatPurchaseRate = nextRate;
        }
      }
    }

    if (!certificateInfo && /证照信息/.test(line)) {
      certificateInfo = "证照信息あり";
    }

    if (/交易勋章|实力商家|深度验厂|诚信通/.test(line)) {
      badges.push(line);
    }
  }

  const scoreLabels = ["综合服务", "采购咨询", "物流时效", "纠纷解决", "品质体验", "退换体验"];
  for (const label of scoreLabels) {
    const regex = new RegExp(`${label}\\s*([0-5](?:\\.\\d)?)`);
    const match = text.match(regex);
    if (match && match[1]) {
      serviceScores.push({ name: label, score: match[1] });
    }
  }

  return {
    name: fromDomName,
    yearsOnPlatform,
    region,
    repeatPurchaseRate,
    certificateInfo,
    badges: Array.from(new Set(badges)).slice(0, 10),
    serviceScores
  };
}

function findDescriptionAndPackaging() {
  const lines = getBodyLines();
  let packagingInfo = "";
  const detailChunks = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!packagingInfo && /包装信息/.test(line)) {
      const next = [];
      for (let j = i + 1; j <= i + 5 && j < lines.length; j += 1) {
        if (/商品详情|评价|交易记录/.test(lines[j])) {
          break;
        }
        next.push(lines[j]);
      }
      packagingInfo = normalizeText(next.join(" | "));
    }

    if (/商品详情|宝贝详情|产品详情/.test(line)) {
      const next = [];
      for (let j = i + 1; j <= i + 20 && j < lines.length; j += 1) {
        if (/包装信息|评价|交易记录|店铺/.test(lines[j])) {
          break;
        }
        next.push(lines[j]);
      }
      if (next.length) {
        detailChunks.push(normalizeText(next.join(" ")));
      }
    }
  }

  if (!packagingInfo) {
    const packed = pickJsonValueByKeys([
      "packingInfo",
      "packageInfo",
      "packageDesc",
      "packingDesc",
      "goodsWeight",
      "weight"
    ]);
    if (packed) {
      packagingInfo = packed;
    }
  }

  if (!packagingInfo) {
    const flatText = document.body ? document.body.innerText : "";
    const m = flatText.match(/包装信息\s*[:：]?\s*([^\n]{1,300})/);
    if (m && m[1]) {
      packagingInfo = normalizeText(m[1]);
    }
  }

  if (!packagingInfo) {
    const html = document.documentElement ? document.documentElement.innerHTML : "";
    const htmlMatch = html.match(/包装信息[\s\S]{0,300}?((?:重量|件重尺|净重|毛重)[^<"\n]{1,120})/);
    if (htmlMatch && htmlMatch[1]) {
      packagingInfo = normalizeText(htmlMatch[1]);
    }
  }

  return {
    packagingInfo,
    description: normalizeText(detailChunks.join(" ")).slice(0, 5000)
  };
}

function findReviews() {
  const text = document.body ? document.body.innerText : "";
  const lines = getBodyLines();
  const metrics = [];
  const labels = ["物流", "服务", "质量", "描述", "综合", "品质", "退换", "纠纷"];

  for (const line of lines) {
    const scoreMatch = line.match(/^([^\d]{1,20})\s*([0-5](?:\.\d)?)$/);
    if (!scoreMatch) {
      continue;
    }
    const name = normalizeText(scoreMatch[1]);
    const score = scoreMatch[2];
    if (labels.some((label) => name.includes(label))) {
      metrics.push({ name, score });
    }
    if (metrics.length >= 10) {
      break;
    }
  }

  const reviewCountMatch = text.match(/(\d+)条评价|评价\s*(\d+)/);
  const reviewCount = reviewCountMatch ? reviewCountMatch[1] || reviewCountMatch[2] || "" : "";
  const reviewSummary = findTextByRegex(/商品评价\s*[:：]?\s*([^\n]{1,200})/i);

  return {
    reviewCount,
    summary: reviewSummary,
    metrics
  };
}

function isEmptyValue(value) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return normalizeText(value) === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  return false;
}

function collectMissingFields(data) {
  const checks = [
    ["productId", data.productId],
    ["title", data.title],
    ["images", data.images],
    ["price", data.price],
    ["priceTiers", data.priceTiers],
    ["moq", data.moq],
    ["attributes", data.attributes],
    ["variants.colors", data.variants && data.variants.colors],
    ["variants.sizes", data.variants && data.variants.sizes],
    ["skuList", data.skuList],
    ["seller", data.seller],
    ["shop.name", data.shop && data.shop.name],
    ["shop.yearsOnPlatform", data.shop && data.shop.yearsOnPlatform],
    ["shop.region", data.shop && data.shop.region],
    ["shop.repeatPurchaseRate", data.shop && data.shop.repeatPurchaseRate],
    ["shop.certificateInfo", data.shop && data.shop.certificateInfo],
    ["shop.badges", data.shop && data.shop.badges],
    ["shop.serviceScores", data.shop && data.shop.serviceScores],
    ["packagingInfo", data.packagingInfo],
    ["description", data.description],
    ["detailImages", data.detailImages],
    ["reviews.reviewCount", data.reviews && data.reviews.reviewCount],
    ["reviews.summary", data.reviews && data.reviews.summary],
    ["reviews.metrics", data.reviews && data.reviews.metrics],
    ["url", data.url],
    ["crawledAt", data.crawledAt]
  ];

  const missingFields = checks
    .filter(([, value]) => isEmptyValue(value))
    .map(([field]) => field);

  return missingFields;
}

function buildExtractionStats(data) {
  const totalFields = 27;
  const missingCount = Array.isArray(data && data.missingFields) ? data.missingFields.length : totalFields;
  const filledFields = Math.max(0, totalFields - missingCount);
  const coverageRate = totalFields > 0 ? Number((filledFields / totalFields).toFixed(4)) : 0;

  return {
    totalFields,
    filledFields,
    missingCount,
    coverageRate,
    coveragePercent: `${Math.round(coverageRate * 100)}%`
  };
}

function mergeArrays(primary, fallback) {
  const first = Array.isArray(primary) ? primary : [];
  const second = Array.isArray(fallback) ? fallback : [];
  const merged = [];
  const seen = new Set();

  for (const value of [...first, ...second]) {
    const key = typeof value === "string" ? value : JSON.stringify(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(value);
  }

  return merged;
}

function normalizeExtractionFieldOrder(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const variants = data.variants && typeof data.variants === "object" ? data.variants : {};
  const ordered = {
    productId: data.productId || "",
    title: data.title || "",
    images: Array.isArray(data.images) ? data.images : [],
    price: data.price || "",
    priceTiers: Array.isArray(data.priceTiers) ? data.priceTiers : [],
    moq: data.moq || "",
    variants: {
      colors: Array.isArray(variants.colors) ? variants.colors : [],
      sizes: Array.isArray(variants.sizes) ? variants.sizes : []
    },
    skuList: Array.isArray(data.skuList) ? data.skuList : [],
    seller: data.seller || "",
    shop: data.shop && typeof data.shop === "object" ? data.shop : {},
    packagingInfo: data.packagingInfo || "",
    description: data.description || "",
    detailImages: Array.isArray(data.detailImages) ? data.detailImages : [],
    reviews: data.reviews && typeof data.reviews === "object" ? data.reviews : {},
    attributes: Array.isArray(data.attributes) ? data.attributes : [],
    url: data.url || window.location.href,
    crawledAt: data.crawledAt || new Date().toISOString(),
    source: data.source || "fallback"
  };

  if (Array.isArray(data.missingFields)) {
    ordered.missingFields = data.missingFields;
  }
  if (data.extractionStats && typeof data.extractionStats === "object") {
    ordered.extractionStats = data.extractionStats;
  }
  if (Object.prototype.hasOwnProperty.call(data, "extractionPatternCount")) {
    ordered.extractionPatternCount = data.extractionPatternCount;
  }

  for (const [key, value] of Object.entries(data)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
      ordered[key] = value;
    }
  }

  return ordered;
}

function mergeDataCandidate(base, incoming) {
  if (!base) {
    return incoming;
  }
  if (!incoming) {
    return base;
  }

  const merged = {
    ...base,
    productId: base.productId || incoming.productId,
    title: base.title || incoming.title,
    images: mergeArrays(base.images, incoming.images).slice(0, 40),
    price: base.price || incoming.price,
    priceTiers: mergeArrays(base.priceTiers, incoming.priceTiers).slice(0, 10),
    moq: base.moq || incoming.moq,
    attributes: mergeArrays(base.attributes, incoming.attributes).slice(0, 60),
    variants: {
      colors: mergeArrays(base.variants && base.variants.colors, incoming.variants && incoming.variants.colors).slice(0, 40),
      sizes: mergeArrays(base.variants && base.variants.sizes, incoming.variants && incoming.variants.sizes).slice(0, 60)
    },
    skuList: mergeArrays(base.skuList, incoming.skuList).slice(0, 150),
    seller: base.seller || incoming.seller,
    shop: {
      name: (base.shop && base.shop.name) || (incoming.shop && incoming.shop.name) || "",
      yearsOnPlatform: (base.shop && base.shop.yearsOnPlatform) || (incoming.shop && incoming.shop.yearsOnPlatform) || "",
      region: (base.shop && base.shop.region) || (incoming.shop && incoming.shop.region) || "",
      repeatPurchaseRate: (base.shop && base.shop.repeatPurchaseRate) || (incoming.shop && incoming.shop.repeatPurchaseRate) || "",
      certificateInfo: (base.shop && base.shop.certificateInfo) || (incoming.shop && incoming.shop.certificateInfo) || "",
      badges: mergeArrays(base.shop && base.shop.badges, incoming.shop && incoming.shop.badges).slice(0, 20),
      serviceScores: mergeArrays(base.shop && base.shop.serviceScores, incoming.shop && incoming.shop.serviceScores).slice(0, 20)
    },
    packagingInfo: base.packagingInfo || incoming.packagingInfo,
    description: base.description || incoming.description,
    detailImages: mergeArrays(base.detailImages, incoming.detailImages).slice(0, 80),
    reviews: {
      reviewCount: (base.reviews && base.reviews.reviewCount) || (incoming.reviews && incoming.reviews.reviewCount) || "",
      summary: (base.reviews && base.reviews.summary) || (incoming.reviews && incoming.reviews.summary) || "",
      metrics: mergeArrays(base.reviews && base.reviews.metrics, incoming.reviews && incoming.reviews.metrics).slice(0, 20)
    },
    url: base.url || incoming.url,
    crawledAt: base.crawledAt || incoming.crawledAt,
    source: mergeArrays([base.source].filter(Boolean), [incoming.source].filter(Boolean)).join("+") || "fallback"
  };

  merged.missingFields = collectMissingFields(merged);
  merged.extractionStats = buildExtractionStats(merged);
  return normalizeExtractionFieldOrder(merged);
}

function evaluateDataScore(data) {
  if (!data || !data.extractionStats) {
    return 0;
  }

  const baseScore = data.extractionStats.filledFields;
  const hasTitle = data.title ? 2 : 0;
  const hasImages = data.images && data.images.length ? 2 : 0;
  const hasPrice = data.price ? 1 : 0;
  return baseScore + hasTitle + hasImages + hasPrice;
}

function isElementVisible(element) {
  if (!element) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isElementDisabled(element) {
  if (!element) {
    return true;
  }

  if (element.disabled || element.getAttribute("aria-disabled") === "true") {
    return true;
  }

  const className = normalizeText(element.className || "").toLowerCase();
  return /disabled|forbid|grey/.test(className);
}

function isSafeClickTarget(element) {
  if (!element) {
    return false;
  }

  if (element.tagName === "A") {
    const href = normalizeText(element.getAttribute("href") || "");
    if (href && !href.startsWith("#") && !/^javascript:/i.test(href)) {
      return false;
    }
  }

  return true;
}

function clickElementSafely(element) {
  if (!element || !isElementVisible(element) || isElementDisabled(element) || !isSafeClickTarget(element)) {
    return false;
  }

  try {
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    if (typeof element.click === "function") {
      element.click();
    }
    return true;
  } catch (_error) {
    return false;
  }
}

function findClickableByText(regexList) {
  const selectors = [
    "a",
    "button",
    "[role='tab']",
    "[role='button']",
    ".tab-item",
    ".next-tabs-tab",
    "li[class*='tab']",
    "div[class*='tab']",
    "span[class*='tab']",
    ".od-pc-offer-tab-item",
    ".sku-attr-item"
  ];

  const nodes = document.querySelectorAll(selectors.join(","));
  const candidates = [];

  for (const node of nodes) {
    if (!isElementVisible(node) || isElementDisabled(node) || !isSafeClickTarget(node)) {
      continue;
    }

    const text = normalizeText(node.textContent || "");
    if (!text || text.length > 40) {
      continue;
    }

    if (regexList.some((regex) => regex.test(text))) {
      candidates.push(node);
    }
  }

  return candidates[0] || null;
}

function sampleSkuOptionNodes(limit) {
  const selectors = [
    "[data-sku]",
    "[data-sku-id]",
    "[data-value]",
    ".sku-item",
    ".sku-attr",
    ".spec-item",
    "li[class*='sku']",
    "div[class*='sku']",
    "button[class*='sku']",
    "li[class*='prop']",
    "div[class*='prop']"
  ];
  const nodes = document.querySelectorAll(selectors.join(","));
  const unique = [];
  const seen = new Set();

  for (const node of nodes) {
    if (!isElementVisible(node) || isElementDisabled(node) || !isSafeClickTarget(node)) {
      continue;
    }

    const text = normalizeText(node.textContent || "");
    if (!text || text.length > 40) {
      continue;
    }

    const signature = `${text}::${normalizeText(node.className || "")}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);

    unique.push(node);
    if (unique.length >= limit * 3) {
      break;
    }
  }

  return unique;
}

async function clickSkuOptionsForSampling(limit = 4) {
  const nodes = sampleSkuOptionNodes(limit);
  let clickedCount = 0;

  for (const node of nodes) {
    const className = normalizeText(node.className || "").toLowerCase();
    if (/selected|active|current/.test(className)) {
      continue;
    }

    if (clickElementSafely(node)) {
      clickedCount += 1;
      await wait(160);
      if (clickedCount >= limit) {
        break;
      }
    }
  }

  return clickedCount;
}

async function clickSectionByKeywords(regexList) {
  const target = findClickableByText(regexList);
  if (!target) {
    return false;
  }

  return clickElementSafely(target);
}

async function applyExtractionPattern(patternName) {
  // 遅延描画される要素の取得率を上げるために、スクロール位置を変えて再抽出する。
  if (patternName === "scroll-bottom") {
    window.scrollTo(0, document.body ? document.body.scrollHeight : 0);
    await wait(280);
  } else if (patternName === "scroll-middle") {
    const middle = Math.floor((document.body ? document.body.scrollHeight : 0) / 2);
    window.scrollTo(0, middle);
    await wait(220);
  } else if (patternName === "scroll-top") {
    window.scrollTo(0, 0);
    await wait(160);
  } else if (patternName === "open-attributes") {
    const clicked = await clickSectionByKeywords([/商品属性/i, /产品属性/i, /规格参数/i, /参数说明/i, /属性参数/i]);
    if (clicked) {
      sendDebugLog("debug", "attribute section clicked", null);
      await wait(520);
    } else {
      await wait(120);
    }
  } else if (patternName === "open-reviews") {
    const clicked = await clickSectionByKeywords([/商品评价/i, /买家评价/i, /评价\s*\d*/i, /评论/i, /口碑/i]);
    if (clicked) {
      sendDebugLog("debug", "review section clicked", null);
      await wait(620);
    } else {
      await wait(120);
    }
  } else if (patternName === "click-sku-options") {
    const clickedCount = await clickSkuOptionsForSampling(4);
    sendDebugLog("debug", "sku options sampled", { clickedCount });
    await wait(clickedCount > 0 ? 320 : 120);
  }
}

function getContextData() {
  try {
    if (typeof window.context !== 'undefined' && window.context?.result?.data) {
      return window.context.result.data;
    }

    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';
      if (text.includes('window.context=') || text.includes('contextPath') || text.includes('result')) {
        // 複数のパターンを試行
        const patterns = [
          /window\.context\s*=\s*(\{[\s\S]*?})\s*(?:;|\n|<\/script>|$)/,
          /window\.context\s*=\s*(\{[\s\S]*?})\s*}/,
          /window\.context\s*=\s*(\{[\s\S]{500,}?})\s*;/,
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const fullJson = '{' + match[1] + '}';
            const parsed = parseJsonSafely(fullJson);
            if (parsed?.result?.data) {
              console.log('getContextData: Found via pattern', pattern.source);
              sendDebugLog("debug", "getContextData matched", { pattern: pattern.source });
              return parsed.result.data;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('getContextData error:', e);
    sendDebugLog("warn", "getContextData error", {
      error: e && e.message ? e.message : String(e)
    });
  }
  return null;
}

function extractProductData() {
  const contextData = getContextData();
  const jsonLdProducts = collectJsonLdProducts();
  const priceTiers = findPriceTiers();
  const variants = findVariants();
  const detailImages = findDetailImages();
  const detailText = findDescriptionAndPackaging();

  let productId = deriveProductId(jsonLdProducts);
  let title = findTitle(jsonLdProducts);
  let images = findImages(jsonLdProducts);
  let price = findPrice(jsonLdProducts);
  let attributes = findAttributes();

  // window.context優先で上書き
  if (contextData) {
    const gallery = contextData.gallery?.fields || contextData.gallery;
    if (gallery) {
      if (gallery.mainImage && Array.isArray(gallery.mainImage)) {
        images = gallery.mainImage.map(url => url + '_.webp').filter(Boolean);
      }
      if (!productId && gallery.offerId) productId = String(gallery.offerId);
    }

    const offer = contextData.offer || contextData.productInfo;
    if (offer) {
      if (!title && (offer.subject || offer.title)) title = offer.subject || offer.title;
      if (!price && (offer.price || offer.discountPrice)) {
        price = '¥' + (offer.price || offer.discountPrice);
      }
      if (offer.offerId && !productId) productId = String(offer.offerId);
    }

    if (contextData.productAttributes?.fields?.attributes) {
      attributes = contextData.productAttributes.fields.attributes.map(attr => ({
        key: attr.label || attr.name || '',
        value: attr.value || ''
      })).filter(a => a.key && a.value);
    }
  }

  const data = {
    productId,
    title,
    images: images.length ? images : findImages(jsonLdProducts),
    price,
    priceTiers,
    moq: findMoq(),
    attributes,
    variants: {
      colors: variants.colors,
      sizes: variants.sizes
    },
    skuList: variants.skus,
    seller: findSeller(jsonLdProducts),
    shop: findShopInfo(jsonLdProducts),
    packagingInfo: detailText.packagingInfo,
    description: detailText.description,
    detailImages,
    reviews: findReviews(),
    url: window.location.href,
    crawledAt: new Date().toISOString(),
    source: contextData ? 'window.context' : 'fallback'
  };

  if (!data.seller && data.shop && data.shop.name) {
    data.seller = data.shop.name;
  }

  if (data.priceTiers.length && !data.moq) {
    const tierWithMoq = data.priceTiers.find((tier) => /起批|件/.test(tier.quantity || ""));
    if (tierWithMoq) {
      data.moq = tierWithMoq.quantity;
    }
  }

  // Keep this as the final key so downstream tools can read missing items at the end.
  data.missingFields = collectMissingFields(data);
  data.extractionStats = buildExtractionStats(data);

  return normalizeExtractionFieldOrder(data);
}

function hasSufficientData(data) {
  if (!data) {
    return false;
  }

  if (data.title && data.images && data.images.length) {
    return true;
  }

  return Boolean(data.productId && (data.title || data.price));
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function extractProductDataWithRetry() {
  const patterns = ["normal", "open-attributes", "open-reviews", "scroll-middle", "scroll-bottom", "scroll-top"];
  const candidates = [];

  for (let i = 0; i < patterns.length; i += 1) {
    await applyExtractionPattern(patterns[i]);
    const data = extractProductData();
    candidates.push(data);

    if (i < patterns.length - 1) {
      await wait(260);
    }
  }

  let best = null;
  for (const candidate of candidates) {
    if (!best || evaluateDataScore(candidate) > evaluateDataScore(best)) {
      best = candidate;
    }
  }

  let merged = best;
  for (const candidate of candidates) {
    merged = mergeDataCandidate(merged, candidate);
  }

  merged.extractionPatternCount = patterns.length;
  return normalizeExtractionFieldOrder(merged);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "EXTRACT_PRODUCT") {
    return;
  }

  (async () => {
    sendDebugLog("info", "EXTRACT_PRODUCT received", null);
    const data = await extractProductDataWithRetry();
    if (!hasSufficientData(data)) {
      const stats = data.extractionStats || { coveragePercent: "0%" };
      const missingPreview = Array.isArray(data.missingFields) ? data.missingFields.slice(0, 8).join(", ") : "";
      sendDebugLog("warn", "extraction data insufficient", {
        coverage: stats.coveragePercent,
        missingPreview
      });
      sendResponse({
        ok: false,
        data,
        error: {
          code: "EXTRACTION_EMPTY",
          message: `主要項目の抽出が不十分です。取得率: ${stats.coveragePercent}${missingPreview ? ` / 未取得: ${missingPreview}` : ""}`
        }
      });
      return;
    }

    sendDebugLog("info", "extraction success", {
      title: data.title || "",
      coverage: data.extractionStats ? data.extractionStats.coveragePercent : "-"
    });
    sendResponse({ ok: true, data });
  })().catch((error) => {
    sendDebugLog("error", "extraction exception", {
      error: error && error.message ? error.message : String(error)
    });
    sendResponse({
      ok: false,
      error: {
        code: "EXTRACTION_ERROR",
        message: error && error.message ? error.message : "不明な抽出エラー"
      }
    });
  });

  return true;
});

function isDetail1688Page() {
  try {
    const url = new URL(window.location.href);
    return url.hostname === "detail.1688.com";
  } catch (_error) {
    return false;
  }
}

function createOverlayContainer() {
  const container = document.createElement("div");
  container.id = "ec-ai-extract-overlay";
  container.style.position = "fixed";
  container.style.right = "16px";
  container.style.top = "16px";
  container.style.zIndex = "2147483647";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "flex-end";
  container.style.gap = "8px";
  return container;
}

function createExtractButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "ec-ai-extract-btn";
  button.textContent = "EC AI 情報取得";
  button.title = "EC AI: 現在の1688商品情報を抽出（中国語原文を保持）";
  button.style.border = "0";
  button.style.borderRadius = "999px";
  button.style.padding = "10px 14px";
  button.style.background = "#ff6a00";
  button.style.color = "#fff";
  button.style.fontSize = "14px";
  button.style.fontWeight = "700";
  button.style.boxShadow = "0 8px 24px rgba(0,0,0,0.22)";
  button.style.cursor = "pointer";
  return button;
}

function createManagerLink() {
  const link = document.createElement("a");
  link.id = "ec-ai-manager-link";
  link.href = "#";
  link.title = "EC AI マネージャーを開く";
  link.setAttribute("aria-label", "EC AI マネージャーを開く");
  link.textContent = "⚙";
  link.style.display = "inline-flex";
  link.style.alignItems = "center";
  link.style.justifyContent = "center";
  link.style.padding = "0 12px";
  link.style.height = "38px";
  link.style.border = "1px solid #d9d9d9";
  link.style.borderRadius = "999px";
  link.style.background = "#fff";
  link.style.color = "#444";
  link.style.fontSize = "18px";
  link.style.fontWeight = "700";
  link.style.textDecoration = "none";
  link.style.boxShadow = "0 8px 24px rgba(0,0,0,0.16)";
  link.style.cursor = "pointer";

  const requestOpenManagerPage = () =>
    new Promise((resolve, reject) => {
      let finished = false;
      const timeout = setTimeout(() => {
        if (finished) {
          return;
        }
        finished = true;
        reject(new Error("OPEN_MANAGER_PAGE_TIMEOUT"));
      }, 2200);

      try {
        chrome.runtime.sendMessage({ type: "OPEN_MANAGER_PAGE" }, (response) => {
          if (finished) {
            return;
          }

          finished = true;
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || "OPEN_MANAGER_PAGE_FAILED"));
            return;
          }

          if (!response || !response.ok) {
            const message = response && response.error && response.error.message ? response.error.message : "OPEN_MANAGER_PAGE_FAILED";
            reject(new Error(message));
            return;
          }

          resolve(response.data || true);
        });
      } catch (error) {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          reject(error);
        }
      }
    });

  link.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (link.dataset.opening === "1") {
      return;
    }

    link.dataset.opening = "1";
    link.style.pointerEvents = "none";

    let opened = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await requestOpenManagerPage();
        opened = true;
        break;
      } catch (error) {
        sendDebugLog("warn", "open manager page failed", {
          attempt,
          error: error && error.message ? error.message : String(error)
        });
      }
    }

    if (!opened) {
      try {
        const fallbackUrl = chrome.runtime.getURL("options/manager.html");
        window.open(fallbackUrl, "_blank", "noopener");
        opened = true;
        sendDebugLog("info", "open manager page fallback used", null);
      } catch (error) {
        sendDebugLog("error", "open manager page fallback failed", {
          error: error && error.message ? error.message : String(error)
        });
      }
    }

    if (!opened) {
      alert("管理画面を開けませんでした。拡張機能を再読み込みして再試行してください。");
    }

    setTimeout(() => {
      delete link.dataset.opening;
      link.style.pointerEvents = "auto";
    }, 150);
  });

  link.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      link.click();
    }
  });

  link.addEventListener("mousedown", (event) => {
    // Avoid site-level drag or pointer listeners from hijacking the gear icon click.
    event.stopPropagation();
  });

  return link;
}

function createResultPanel() {
  const panel = document.createElement("div");
  panel.id = "ec-ai-extract-result";
  panel.style.display = "none";
  panel.style.position = "relative";
  panel.style.width = "min(560px, calc(100vw - 32px))";
  panel.style.maxHeight = "60vh";
  panel.style.overflow = "auto";
  panel.style.background = "#fff";
  panel.style.border = "1px solid #e5e7eb";
  panel.style.borderRadius = "12px";
  panel.style.boxShadow = "0 12px 32px rgba(0,0,0,0.18)";
  panel.style.padding = "10px";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-start";
  actions.style.alignItems = "center";
  actions.style.marginBottom = "8px";
  actions.style.paddingRight = "36px";

  const title = document.createElement("strong");
  title.textContent = "抽出結果（中国語原文）";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "JSONをコピー";
  copyBtn.style.border = "1px solid #ddd";
  copyBtn.style.background = "#f7f7f7";
  copyBtn.style.borderRadius = "8px";
  copyBtn.style.padding = "6px 10px";
  copyBtn.style.cursor = "pointer";

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.textContent = "JSONをダウンロード";
  downloadBtn.style.border = "1px solid #ddd";
  downloadBtn.style.background = "#f7f7f7";
  downloadBtn.style.borderRadius = "8px";
  downloadBtn.style.padding = "6px 10px";
  downloadBtn.style.cursor = "pointer";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "X";
  closeBtn.title = "閉じる";
  closeBtn.style.border = "1px solid #ddd";
  closeBtn.style.background = "#fff";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.width = "28px";
  closeBtn.style.height = "28px";
  closeBtn.style.lineHeight = "1";
  closeBtn.style.padding = "0";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "8px";
  closeBtn.style.right = "8px";
  closeBtn.style.fontWeight = "700";

  closeBtn.addEventListener("click", () => {
    panel.style.display = "none";
  });

  const pre = document.createElement("pre");
  pre.id = "ec-ai-extract-json";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordBreak = "break-word";
  pre.style.margin = "0";
  pre.style.fontSize = "12px";

  const summary = document.createElement("div");
  summary.id = "ec-ai-extract-summary";
  summary.style.marginBottom = "8px";
  summary.style.fontSize = "12px";
  summary.style.lineHeight = "1.6";

  const missing = document.createElement("div");
  missing.id = "ec-ai-extract-missing";
  missing.style.marginBottom = "8px";
  missing.style.fontSize = "12px";
  missing.style.lineHeight = "1.6";
  missing.style.color = "#8a3b12";

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent || "");
      copyBtn.textContent = "コピー済み";
      setTimeout(() => {
        copyBtn.textContent = "JSONをコピー";
      }, 1000);
    } catch (_error) {
      copyBtn.textContent = "コピー失敗";
      setTimeout(() => {
        copyBtn.textContent = "JSONをコピー";
      }, 1000);
    }
  });

  downloadBtn.addEventListener("click", () => {
    const preText = pre.textContent || "";
    if (!preText.trim()) {
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(preText);
    } catch (_error) {
      return;
    }

    const fileName = `ec-ai-extraction-${parsed.productId || Date.now()}.json`;
    const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  });

  actions.appendChild(title);
  const rightActions = document.createElement("div");
  rightActions.style.display = "flex";
  rightActions.style.gap = "6px";
  rightActions.appendChild(downloadBtn);
  rightActions.appendChild(copyBtn);

  actions.appendChild(rightActions);
  panel.appendChild(actions);
  panel.appendChild(closeBtn);
  panel.appendChild(summary);
  panel.appendChild(missing);
  panel.appendChild(pre);

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      panel.style.display = "none";
    }
  });

  return panel;
}

async function saveLastExtraction(data) {
  try {
    await chrome.runtime.sendMessage({ type: "SAVE_LAST_EXTRACTION", payload: data });
  } catch (_error) {
    // Ignore storage failures in content script UI flow.
  }
}

async function handleInlineExtraction(button, panel) {
  button.disabled = true;
  const original = button.textContent;
  button.textContent = "EC AI 抽出中...";

  try {
    const data = await extractProductDataWithRetry();
    await saveLastExtraction(data);
    const pre = panel.querySelector("#ec-ai-extract-json");
    const summary = panel.querySelector("#ec-ai-extract-summary");
    const missing = panel.querySelector("#ec-ai-extract-missing");
    if (pre) {
      pre.textContent = JSON.stringify(data, null, 2);
      if (summary) {
        const stats = data.extractionStats || { coveragePercent: "0%", filledFields: 0, totalFields: 0 };
        summary.textContent = `取得率: ${stats.coveragePercent} (${stats.filledFields}/${stats.totalFields}) / 抽出パターン: ${data.extractionPatternCount || 1}`;
        summary.style.color = hasSufficientData(data) ? "#0f766e" : "#b45309";
      }
      if (missing) {
        if (Array.isArray(data.missingFields) && data.missingFields.length) {
          missing.textContent = `未取得項目: ${data.missingFields.join(", ")}`;
          missing.style.color = "#8a3b12";
        } else {
          missing.textContent = "未取得項目: なし";
          missing.style.color = "#0f766e";
        }
      }
      panel.style.display = "block";
      panel.tabIndex = -1;
      panel.focus();
    }

    button.textContent = hasSufficientData(data) ? "EC AI 抽出完了" : "EC AI 一部抽出";
    setTimeout(() => {
      button.textContent = original;
    }, 1000);
  } catch (_error) {
    button.textContent = "EC AI 抽出失敗";
    setTimeout(() => {
      button.textContent = original;
    }, 1200);
  } finally {
    button.disabled = false;
  }
}

function mountInlineExtractionWidget() {
  if (!isDetail1688Page()) {
    return;
  }
  if (document.getElementById("ec-ai-extract-overlay")) {
    return;
  }

  const container = createOverlayContainer();
  const button = createExtractButton();
  const managerLink = createManagerLink();
  const panel = createResultPanel();
  const actionRow = document.createElement("div");
  actionRow.style.display = "flex";
  actionRow.style.alignItems = "center";
  actionRow.style.gap = "8px";

  button.addEventListener("click", () => {
    handleInlineExtraction(button, panel);
  });

  actionRow.appendChild(button);
  actionRow.appendChild(managerLink);
  container.appendChild(actionRow);
  container.appendChild(panel);
  document.documentElement.appendChild(container);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountInlineExtractionWidget, { once: true });
} else {
  mountInlineExtractionWidget();
}
