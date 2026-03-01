const CSV_HEADER = ['timestamp', 'keyword', 'site', 'title', 'price', 'url', 'status'];

function escapeCsv(value) {
  const safe = String(value ?? '').replace(/"/g, '""');
  return `"${safe}"`;
}

export function toCsv(records) {
  const lines = [CSV_HEADER.join(',')];
  for (const record of records) {
    lines.push([
      record.timestamp,
      record.keyword,
      record.site,
      record.title,
      record.price,
      record.url,
      record.status
    ].map(escapeCsv).join(','));
  }
  return `${lines.join('\n')}\n`;
}
