/**
 * 根据爬取的政策数据生成 HTML 网页
 * 输出: output/index.html
 */

const fs = require('fs-extra');
const dayjs = require('dayjs');

/**
 * 生成完整的 HTML 页面
 */
function generateHTML(data) {
  const today = dayjs().format('YYYY年MM月DD日');
  const updateTime = dayjs().format('YYYY-MM-DD HH:mm');

  // 按分类整理数据
  const categories = {
    national:   { name: '国家政策', icon: '🏛️', items: [] },
    storage:    { name: '储能政策', icon: '🔋', items: [] },
    residential:{ name: '户用光伏', icon: '🏠', items: [] },
    commercial: { name: '工商业光伏', icon: '🏭', items: [] },
    grid:       { name: '电网消纳', icon: '⚡', items: [] },
  };

  (data || []).forEach(item => {
    const cat = categories[item.category] || categories['national'];
    cat.items.push(item);
  });

  // 生成卡片 HTML
  function renderCards(items) {
    if (!items || items.length === 0) return '<p style="color:#888">暂无数据</p>';
    return items.map(item => `
      <div class="card">
        <div class="card-date">${item.date || '未知日期'}</div>
        <div class="card-title">
          <a href="${item.url || '#'}" target="_blank" rel="noopener">${item.title}</a>
        </div>
        <div class="card-source">来源：${item.source || '未知'}</div>
      </div>
    `).join('\n');
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>光伏政策日报 | 新能源行业资讯</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; background: #0d1117; color: #c9d1d9; min-height: 100vh; }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { text-align: center; padding: 40px 0 30px; border-bottom: 1px solid #21262d; margin-bottom: 30px; }
    header h1 { font-size: 2em; color: #fff; margin-bottom: 8px; }
    header p { color: #8b949e; font-size: 0.95em; }
    .update-time { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 10px 16px; margin-bottom: 30px; font-size: 0.9em; color: #8b949e; text-align: center; }
    .category { margin-bottom: 36px; }
    .category-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #21262d; }
    .category-icon { font-size: 1.4em; }
    .category-title { font-size: 1.2em; font-weight: 600; color: #fff; }
    .category-count { margin-left: auto; background: #21262d; padding: 2px 10px; border-radius: 12px; font-size: 0.8em; color: #8b949e; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; transition: border-color 0.2s; }
    .card:hover { border-color: #58a6ff; }
    .card-date { font-size: 0.8em; color: #8b949e; margin-bottom: 8px; }
    .card-title { font-size: 0.95em; line-height: 1.5; margin-bottom: 8px; }
    .card-title a { color: #c9d1d9; }
    .card-title a:hover { color: #58a6ff; }
    .card-source { font-size: 0.8em; color: #6e7681; }
    footer { text-align: center; padding: 30px 0; margin-top: 40px; border-top: 1px solid #21262d; color: #6e7681; font-size: 0.85em; }
    @media (max-width: 700px) {
      .cards { grid-template-columns: 1fr; }
      header h1 { font-size: 1.4em; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>☀️ 光伏政策日报</h1>
      <p>新能源行业资讯 · 每日自动更新</p>
    </header>

    <div class="update-time">📅 最近更新：${updateTime}｜数据来源：国家能源局、国家发改委等官方渠道</div>

    ${Object.entries(categories).map(([key, cat]) => `
      <section class="category">
        <div class="category-header">
          <span class="category-icon">${cat.icon}</span>
          <span class="category-title">${cat.name}</span>
          <span class="category-count">${cat.items.length} 条</span>
        </div>
        <div class="cards">
          ${renderCards(cat.items)}
        </div>
      </section>
    `).join('\n')}

    <footer>
      <p>光伏政策日报 · 每日自动爬取更新 · ${today}</p>
      <p style="margin-top:8px">联系方式：方俊 | 邮箱：fjoy0123@example.com</p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 读取爬取的数据（由 run-all.js 生成）
    const dataPath = `${__dirname}/output/data.json`;
    let data = [];
    if (await fs.pathExists(dataPath)) {
      data = await fs.readJson(dataPath);
    } else {
      console.warn('⚠️ 未找到 data.json，使用空数据');
    }

    const html = generateHTML(data);
    await fs.ensureDir(`${__dirname}/output`);
    await fs.writeFile(`${__dirname}/output/index.html`, html, 'utf8');

    console.log(`✅ HTML 生成成功: output/index.html（共 ${data.length} 条数据）`);
  } catch (err) {
    console.error('❌ 生成 HTML 失败:', err.message);
    process.exit(1);
  }
}

main();
