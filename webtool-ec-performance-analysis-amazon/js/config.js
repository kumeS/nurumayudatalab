export const CONFIG = {
    DB_NAME: 'AmazonPerformanceDB',
    DB_VERSION: 1,
    THRESHOLDS: {
        SESSIONS_GOOD: 200,
        SESSIONS_OK: 100,
        CVR_EXCELLENT: 5,
        CVR_GOOD: 3,
        CVR_CRITICAL: 1,
        ORDERS_MIN: 10,
        NEW_PRODUCT_DAYS: 30,
        DROP_ALERT_PCT: 30
    },
    CATEGORIES: {
        I: { name: '急落警戒（トレンド悪化）', priority: 1, color: '#e17055' },
        D: { name: '改善困難（低CVR商品）', priority: 2, color: '#ff7675' },
        G: { name: '高単価・機会損失（要CVR改善）', priority: 3, color: '#fdcb6e' },
        C: { name: '広告強化推奨（高CVR商品）', priority: 4, color: '#ffeaa7' },
        A: { name: '広告投入推奨（新規商品）', priority: 5, color: '#fab1a0' },
        H: { name: '合わせ買い推奨（薄利多売傾向）', priority: 6, color: '#81ecec' },
        B: { name: '自力成長期待（安定商品）', priority: 7, color: '#55efc4' },
        K: { name: '販売継続（基準クリア）', priority: 8, color: '#00b894' }, // New Category K
        E: { name: 'セッション不足（露出不足）', priority: 9, color: '#74b9ff' },
        F: { name: '注文不足', priority: 9, color: '#a29bfe' },
        J: { name: '標準', priority: 10, color: '#dfe6e9' }
    },
    SEASONALITY: {
        SS: { keywords: ['春', '夏', 'SS', '半袖', 'サマー'], label: '春夏', months: [2, 3, 4, 5, 6, 7] }, // Mar-Aug (0-indexed: 2-7)
        AW: { keywords: ['秋', '冬', 'AW', '長袖', 'ウインター'], label: '秋冬', months: [8, 9, 10, 11, 0, 1] }, // Sep-Feb
        ALL: { keywords: ['通年', 'オールシーズン'], label: '通年', months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
    }
};
