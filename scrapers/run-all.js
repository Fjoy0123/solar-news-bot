/**
 * 主入口：运行所有爬虫，合并数据，生成 data.json
 */

const fs = require('fs-extra');
const dayjs = require('dayjs');

const scrapers = [];

// 动态加载所有爬虫模块
try { scrapers.push(require('./nea.js')); } catch (e) { console.warn('nea.js 加载失败:', e.message); }

async function runAll() {
  console.log('=== 光伏政策爬虫开始 ===');
  const allResults = [];

  for (const scraper of scrapers) {
    try {
      const fn = scraper.scrapeNEA || scraper.scrape || Object.values(scraper).find(v => typeof v === 'function');
      if (!fn) continue;
      const results = await fn();
      if (Array.isArray(results)) {
        allResults.push(...results);
        console.log(`  ✅ ${scraper.SOURCE_NAME || '未知来源'}: ${results.length} 条`);
      }
    } catch (e) {
      console.error(`  ❌ 爬虫失败: ${e.message}`);
    }
  }

  // 去重（按标题+URL）
  const unique = Array.from(
    new Map(allResults.map(i => [i.title + i.url, i])).values()
  );

  // 按日期倒序
  unique.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 保存到 output/data.json
  await fs.ensureDir(`${__dirname}/../output`);
  await fs.writeJson(`${__dirname}/../output/data.json`, unique, { spaces: 2 });

  console.log(`\n=== 完成！共爬取 ${unique.length} 条政策信息 ===`);
  return unique;
}

if (require.main === module) {
  runAll().catch(e => { console.error('运行失败:', e.message); process.exit(1); });
}

module.exports = { runAll };
