#!/usr/bin/env node
import fs from 'node:fs/promises';
import process from 'node:process';
import { createFetchClient, searchAll } from '../core/scrape.js';
import { toCsv } from '../core/csv.js';

function usage() {
  console.log(`
WatchMate Node CLI

使い方:
  node src/runtime/cli.js -q "検索キーワード" [オプション]

必須:
  -q, --query KEYWORD        検索キーワード

オプション:
  -s, --site SITE            対象サイト (7net|hmv|animate|rakuten|all) [default: all]
  -m, -t, --max NUM          最大表示件数 [default: 10]
  -p, --product-filter TEXT  タイトル部分一致フィルタ
  -csvoutput FILE            CSV出力ファイル
  -v, --verbose              詳細出力
  -h, --help                 ヘルプ

例:
  node src/runtime/cli.js -q "Vジャンプ"
  node src/runtime/cli.js -q "ドラゴンボール" --site hmv --max 5
  node src/runtime/cli.js -q "ONE PIECE" -p "特装版" -csvoutput results-node.csv
`);
}

function parseArgs(argv) {
  const options = {
    query: '',
    site: 'all',
    maxResults: 10,
    productFilter: '',
    csvOutput: '',
    verbose: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '-q':
      case '--query':
        options.query = argv[++index] || '';
        break;
      case '-s':
      case '--site':
        options.site = argv[++index] || 'all';
        break;
      case '-m':
      case '-t':
      case '--max':
        options.maxResults = Number.parseInt(argv[++index] || '10', 10);
        break;
      case '-p':
      case '--product-filter':
        options.productFilter = argv[++index] || '';
        break;
      case '-csvoutput':
      case '--csvoutput':
        options.csvOutput = argv[++index] || '';
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        throw new Error(`不明なオプション: ${arg}`);
    }
  }

  return options;
}

function printSummary(options) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  WatchMate Node CLI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  キーワード: ${options.query}`);
  console.log(`  対象サイト: ${options.site}`);
  console.log(`  最大件数:   ${options.maxResults}`);
  if (options.productFilter) {
    console.log(`  タイトル絞込: ${options.productFilter}`);
  }
  if (options.csvOutput) {
    console.log(`  CSV出力:   ${options.csvOutput}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

function printSiteResult(result) {
  console.log(`▶ ${result.siteLabel}`);
  console.log(`  URL: ${result.searchUrl}`);

  if (result.error) {
    console.log(`  [WARN] 取得失敗: ${result.error}`);
    console.log('');
    return;
  }

  if (result.records.length === 0) {
    console.log('  [WARN] 検索結果なし');
    console.log('');
    return;
  }

  result.records.forEach((record, index) => {
    const priceLabel = record.price ? ` ¥${record.price}(税込)` : '';
    console.log(`  ${index + 1}. ${record.title}${priceLabel} [${record.status}]`);
    console.log(`     ${record.url}`);
  });

  console.log(`  [OK] ${result.records.length} 件取得`);
  console.log('');
}

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    usage();
    process.exit(1);
  }

  if (options.help) {
    usage();
    return;
  }

  if (!options.query) {
    console.error('[ERROR] 検索キーワードを指定してください (-q)');
    usage();
    process.exit(1);
  }

  if (!Number.isFinite(options.maxResults) || options.maxResults <= 0) {
    console.error('[ERROR] --max は1以上の数値を指定してください');
    process.exit(1);
  }

  const fetchClient = createFetchClient();

  const startedAt = Date.now();
  printSummary(options);

  const results = await searchAll({
    keyword: options.query,
    site: options.site,
    maxResults: options.maxResults,
    productFilter: options.productFilter,
    fetchClient
  });

  let total = 0;
  for (const result of results) {
    printSiteResult(result);
    total += result.records.length;
  }

  const records = results.flatMap((result) => result.records);

  if (options.csvOutput) {
    const csv = toCsv(records);
    await fs.writeFile(options.csvOutput, csv, 'utf8');
  }

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  検索完了');
  console.log(`  合計: ${total} 件`);
  console.log(`  所要時間: ${elapsed} 秒`);
  if (options.csvOutput) {
    console.log(`  CSV保存先: ${options.csvOutput}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

main().catch((error) => {
  console.error('[ERROR] 実行中にエラーが発生しました');
  console.error(error);
  process.exit(1);
});
