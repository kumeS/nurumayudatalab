const STATUS_PATTERNS = {
  '販売終了': /販売終了|販売終了しました|取扱終了|取り扱い終了|終売|販売を終了/i,
  '売り切れ': /売り切れ|売切れ|在庫切れ|品切れ|在庫なし|在庫がありません|SOLD\s*OUT|現在ご購入いただけません|ご注文できない商品/i,
  '予約する': /予約する|予約受付中|ご予約受付中|予約受付|予約商品|予約注文/i,
  '販売中': /販売中|購入する|カートに入れる|買い物かごに入れる|今すぐ購入|注文する|ご注文可能|在庫あり/i
};

function htmlToText(html) {
  return String(html || '')
    .replace(/[\r\n]/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectSalesStatusFromHtml(html) {
  const text = htmlToText(html);
  if (!text) return '判定不可';

  if (STATUS_PATTERNS['販売終了'].test(text)) return '販売終了';
  if (STATUS_PATTERNS['売り切れ'].test(text)) return '売り切れ';
  if (STATUS_PATTERNS['予約する'].test(text)) return '予約する';
  if (STATUS_PATTERNS['販売中'].test(text)) return '販売中';
  return '判定不可';
}
