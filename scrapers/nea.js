/**
 * 国家能源局官网爬虫
 * 目标：政策新闻、公告通知
 */

const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');

const SOURCE_NAME = '国家能源局';
const BASE_URL = 'https://www.nea.gov.cn';

/**
 * 安全解析日期
 */
function parseDate(y, m, d) {
  const year = parseInt(y);
  const month = parseInt(m);
  const day = parseInt(d);
  if (year < 2020 || year > 2027) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

/**
 * 从文本和URL提取日期
 */
function extractDate(text, url) {
  if (text) {
    let m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})[日号]/);
    if (m) { const d = parseDate(m[1], m[2], m[3]); if (d) return d; }
    m = text.match(/(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})/);
    if (m) { const d = parseDate(m[1], m[2], m[3]); if (d) return d; }
  }
  if (url) {
    let m = url.match(/\/(\d{4})(\d{2})(\d{2})\//);
    if (m) { const d = parseDate(m[1], m[2], m[3]); if (d) return d; }
    m = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (m) { const d = parseDate(m[1], m[2], m[3]); if (d) return d; }
  }
  return null;
}

/**
 * 判断是否与政策相关
 */
function isPolicyRelated(text) {
  if (!text || text.length < 6) return false;
  const kw = [
    '光伏','太阳能','风电','新能源','储能','发电',
    '政策','通知','办法','规划','意见','公告','细则','规定',
    '能源','电力','绿电','碳达峰','碳中和',
    '分布式','上网电价','补贴','消纳','并网','容量电价','电价',
  ];
  return kw.some(k => text.includes(k));
}

/**
 * 分类
 */
function categorize(text) {
  if (/储能|容量电价|新型储能/.test(text)) return 'storage';
  if (/户用|家庭|居民/.test(text)) return 'residential';
  if (/工商业|工业|商业|分布式/.test(text)) return 'commercial';
  if (/绿电|消纳|并网|上网|电价/.test(text)) return 'grid';
  if (/规划|十五五|目标|装机/.test(text)) return 'national';
  return 'national';
}

/**
 * 主函数
 */
async function scrapeNEA() {
  const results = [];

  const targets = [
    { url: `${BASE_URL}/`, label: '首页' },
    { url: 'https://www.nea.gov.cn/xwzx/xwzx.htm', label: '新闻中心' },
    { url: 'https://www.nea.gov.cn/zwgk/zc.htm', label: '政策文件' },
  ];

  for (const { url, label } of targets) {
    try {
      console.log(`[${SOURCE_NAME}] 爬取 ${label}: ${url}`);
      const resp = await axios.get(url, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        validateStatus: s => s < 500,
      });

      if (resp.status !== 200) continue;

      const $ = cheerio.load(resp.data);
      const found = [];

      $('a').each((_, el) => {
        const $el = $(el);
        const href = ($el.attr('href') || '').trim();
        const text = $el.text().trim();
        if (!text || text.length < 6 || text.length > 120) return;
        if (!isPolicyRelated(text)) return;

        let fullUrl = href;
        if (href && !href.startsWith('http')) {
          try { fullUrl = new URL(href, url).href; } catch { return; }
        }
        if (!fullUrl) return;

        found.push({
          title: text,
          url: fullUrl,
          source: SOURCE_NAME,
          category: categorize(text),
          date: extractDate(text, fullUrl) || dayjs().format('YYYY-MM-DD'),
          scrapedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        });
      });

      if (found.length > 0) {
        results.push(...found);
        console.log(`[${SOURCE_NAME}] ${label} 获得 ${found.length} 条`);
        break;
      }
    } catch (e) {
      console.warn(`[${SOURCE_NAME}] ${label} 失败: ${e.message}`);
    }
  }

  // 去重
  const unique = Array.from(
    new Map(results.map(i => [i.title + i.url, i])).values()
  );

  // 按日期倒序
  unique.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  console.log(`[${SOURCE_NAME}] 完成，共 ${unique.length} 条`);
  return unique.slice(0, 15);
}

module.exports = { scrapeNEA, SOURCE_NAME };
