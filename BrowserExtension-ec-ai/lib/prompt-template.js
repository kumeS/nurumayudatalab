function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeProductInput(product) {
  if (!product) {
    return {};
  }

  if (typeof product === "string") {
    try {
      const parsed = JSON.parse(product);
      return parsed && typeof parsed === "object" ? parsed : { rawText: product };
    } catch (_error) {
      return { rawText: product };
    }
  }

  if (typeof product === "object") {
    return product;
  }

  return { value: String(product) };
}

function formatPrimitive(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return normalizeText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function formatInlinePairs(obj) {
  if (!obj || typeof obj !== "object") {
    return "";
  }

  return Object.entries(obj)
    .map(([key, value]) => {
      const primitive = formatPrimitive(value);
      if (primitive) {
        return `${key}=${primitive}`;
      }

      if (Array.isArray(value)) {
        const values = value
          .map((item) => formatPrimitive(item))
          .filter(Boolean)
          .join(", ");
        return values ? `${key}=${values}` : "";
      }

      if (value && typeof value === "object") {
        const nested = formatInlinePairs(value);
        return nested ? `${key}={${nested}}` : "";
      }

      return "";
    })
    .filter(Boolean)
    .join(" | ");
}

function renderStructuredPageInfo(product) {
  const source = normalizeProductInput(product);
  const preferredOrder = [
    "title",
    "productId",
    "url",
    "price",
    "moq",
    "seller",
    "variants",
    "description",
    "images",
    "attributes"
  ];

  const knownKeys = preferredOrder.filter((key) => Object.prototype.hasOwnProperty.call(source, key));
  const extraKeys = Object.keys(source).filter((key) => !knownKeys.includes(key));
  const keys = [...knownKeys, ...extraKeys];
  const lines = [];

  keys.forEach((key) => {
    const value = source[key];

    if (value === null || value === undefined || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      if (!value.length) {
        return;
      }

      const primitiveValues = value.map((item) => formatPrimitive(item)).filter(Boolean);
      if (primitiveValues.length === value.length && primitiveValues.length) {
        lines.push(`- ${key}: ${primitiveValues.join(", ")}`);
        return;
      }

      lines.push(`- ${key}:`);
      value.forEach((item) => {
        if (item && typeof item === "object") {
          const inline = formatInlinePairs(item);
          lines.push(`  - ${inline || "(empty)"}`);
          return;
        }

        const primitive = formatPrimitive(item);
        lines.push(`  - ${primitive || "(empty)"}`);
      });
      return;
    }

    if (value && typeof value === "object") {
      const inline = formatInlinePairs(value);
      lines.push(`- ${key}: ${inline || "(empty)"}`);
      return;
    }

    const primitive = formatPrimitive(value);
    if (primitive) {
      lines.push(`- ${key}: ${primitive}`);
    }
  });

  return lines.join("\n") || "- N/A";
}

function renderAttributes(attributes) {
  return (attributes || [])
    .map((item) => {
      if (!item || !item.key) {
        return "";
      }
      return `- ${item.key}: ${item.value || ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

function renderVariants(variants) {
  const lines = [];
  const colors = toArray(variants && variants.colors).map(normalizeText).filter(Boolean);
  const sizes = toArray(variants && variants.sizes).map(normalizeText).filter(Boolean);

  if (colors.length) {
    lines.push(`- Colors: ${colors.join(", ")}`);
  }
  if (sizes.length) {
    lines.push(`- Sizes: ${sizes.join(", ")}`);
  }

  return lines.join("\n");
}

function buildPrompt(product, template) {
  const header = normalizeText(template) || "日本語で商品ページ用の文案を作成してください。";
  const pageInfo = renderStructuredPageInfo(product);
  const sections = [header, "", "[ページ情報]", pageInfo];
  return sections.join("\n");
}

globalThis.PromptTemplate = {
  buildPrompt,
  renderStructuredPageInfo
};
