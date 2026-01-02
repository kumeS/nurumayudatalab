import { CONFIG } from './config.js';

export function isSeasonOff(date, seasonalityType) {
    if (!seasonalityType || seasonalityType === 'ALL') return false;
    
    const month = date.getMonth(); // 0-11
    const config = CONFIG.SEASONALITY[seasonalityType];
    
    if (!config || !config.months) return false;
    
    // If the current month is NOT in the active months, it's season off
    return !config.months.includes(month);
}

export function inferWeekFromDate(dateString) {
    // Pattern 1: YYMMDD-YYMMDD-BusinessReport.csv (Use end date)
    const rangeMatch = dateString.match(/(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
    if (rangeMatch) {
        const startYear = 2000 + parseInt(rangeMatch[1], 10);
        const startMonth = parseInt(rangeMatch[2], 10) - 1;
        const startDay = parseInt(rangeMatch[3], 10);
        
        const endYear = 2000 + parseInt(rangeMatch[4], 10);
        const endMonth = parseInt(rangeMatch[5], 10) - 1;
        const endDay = parseInt(rangeMatch[6], 10);
        
        const startDate = new Date(startYear, startMonth, startDay);
        const endDate = new Date(endYear, endMonth, endDay);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const duration = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            return { date: endDate, startDate, duration };
        }
    }

    // Pattern 2: BusinessReport-DD-MM-YY.csv
    const match = dateString.match(/(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = 2000 + parseInt(match[3], 10);
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
                // Default to 7 days if only end date is known, or 1 day?
                // For safety in this specific project context where files are likely monthly/weekly ranges:
                return { date: date, startDate: new Date(date.getTime() - 6 * 24 * 60 * 60 * 1000), duration: 7 };
            }
        }
    }
    return null;
}

export async function generateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function determineSeasonality(title) {
    if (!title) return 'ALL';
    
    // Check for SS keywords
    for (const keyword of CONFIG.SEASONALITY.SS.keywords) {
        if (title.includes(keyword)) return 'SS';
    }
    
    // Check for AW keywords
    for (const keyword of CONFIG.SEASONALITY.AW.keywords) {
        if (title.includes(keyword)) return 'AW';
    }
    
    // Check for ALL keywords (explicit)
    for (const keyword of CONFIG.SEASONALITY.ALL.keywords) {
        if (title.includes(keyword)) return 'ALL';
    }
    
    return 'ALL'; // Default
}

export function formatCurrency(value) {
    return '￥' + Math.round(value).toLocaleString();
}

export function formatPercent(value) {
    return value.toFixed(1) + '%';
}
