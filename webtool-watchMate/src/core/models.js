export const SITE_KEYS = ['7net', 'hmv', 'animate', 'rakuten'];

export const SITE_LABELS = {
  '7net': 'セブンネット (7net)',
  hmv: 'HMV & BOOKS',
  animate: 'アニメイト',
  rakuten: '楽天ブックス'
};

export const STATUS_VALUES = ['販売終了', '売り切れ', '予約する', '販売中', '判定不可'];

export function normalizeSite(site) {
  if (!site || site === 'all') return 'all';
  const value = String(site).toLowerCase();
  if (SITE_KEYS.includes(value)) return value;
  throw new Error(`不明なサイト: ${site}`);
}

export function selectedSites(site) {
  if (!site || site === 'all') return [...SITE_KEYS];
  return [normalizeSite(site)];
}
