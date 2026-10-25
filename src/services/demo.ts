/** 模拟数据生成器：确定性种子，用于功能演示与测试。所有演示数据均明确标注。 */

/** mulberry32 伪随机数生成器（确定性）。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86400000;
const TOPICS = [
  '产品复盘：这个月做对了什么',
  '独立开发者的一周效率清单',
  '关于 AI 工具选型的 5 个建议',
  '数据驱动的内容创作实验',
  '把「坚持」拆成可执行的最小单位',
  '写给 3 年前的自己的一封信',
  '新网站上线，聊聊技术选型',
  '如何把反馈变成迭代的燃料',
  '一个小技巧：先完成再完美',
  '本周观察：好内容的三层结构',
];

/** 生成 Content CSV（X 分析页导出格式风格，含中英混用表头变体以验证识别）。 */
export function generateDemoContentCsv(seed = 20261025, days = 60, endOffsetDays = 0): string {
  const rand = mulberry32(seed);
  const header = 'tweet id,tweet permalink,tweet text,time,impressions,engagements,engagement rate,retweets,replies,likes,user profile clicks,url clicks,bookmarks';
  const rows: string[] = [];
  const now = Date.now();
  const end = new Date(now - endOffsetDays * DAY_MS);
  end.setHours(0, 0, 0, 0);

  const hourPick = () => {
    // 主要时段：9-11 点、19-22 点
    const r = rand();
    if (r < 0.35) return 9 + Math.floor(rand() * 3);
    if (r < 0.7) return 19 + Math.floor(rand() * 4);
    if (r < 0.85) return 12 + Math.floor(rand() * 4);
    return Math.floor(rand() * 24);
  };

  // 使用安全整数范围内的基准值：X 真实 ID 为 64 位，超出 Number.MAX_SAFE_INTEGER 会导致自增失效
  let postId = 1820000000000000;
  for (let i = 0; i < days; i++) {
    const dayOffset = days - 1 - i; // 0 = 最新一天
    const dayDate = new Date(end.getTime() - dayOffset * DAY_MS);
    const weekday = dayDate.getDay();
    // 最近 14 天发帖略少、曝光略低（用于演示“下降”观察）
    const recentPhase = dayOffset < 14;
    const postsToday = recentPhase ? (rand() < 0.55 ? 1 : 2) : 1 + Math.floor(rand() * 2.4);
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.65 : 1;

    for (let p = 0; p < postsToday; p++) {
      postId += 1;
      const hour = hourPick();
      const minute = Math.floor(rand() * 60);
      const date = new Date(dayDate.getTime() + hour * 3600000 + minute * 60000);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      // 曝光模型：基础量 × 时段 × 周末 × 近期衰减 × 随机波动；小概率爆款
      let base = 2400;
      if (hour >= 8 && hour <= 11) base *= 1.35;
      if (hour >= 18 && hour <= 22) base *= 1.5;
      base *= weekendFactor;
      if (recentPhase) base *= 0.72;
      const isViral = rand() < 0.04;
      const impressions = Math.round(base * (0.55 + rand() * 0.9) * (isViral ? 6 : 1));

      const likes = Math.max(0, Math.round(impressions * (0.02 + rand() * 0.045)));
      const replies = Math.max(0, Math.round(impressions * rand() * 0.006));
      const retweets = Math.max(0, Math.round(impressions * rand() * 0.012));
      const bookmarks = Math.max(0, Math.round(impressions * rand() * 0.008));
      const urlClicks = Math.max(0, Math.round(impressions * rand() * 0.015));
      const profileClicks = Math.max(0, Math.round(impressions * rand() * 0.01));
      const engagements = likes + replies + retweets + bookmarks + urlClicks + profileClicks;
      const er = impressions > 0 ? ((engagements / impressions) * 100).toFixed(2) : '0.00';

      const topic = TOPICS[Math.floor(rand() * TOPICS.length)];
      const text = `${topic} #solyoung #buildinpublic ${isViral ? '🔥 长文' : ''}`;
      const safeText = `"${text.replace(/"/g, '""')}"`;
      const permalink = `https://x.com/sol_young/status/${postId}`;
      rows.push([String(postId), permalink, safeText, iso, String(impressions), String(engagements), er, String(retweets), String(replies), String(likes), String(profileClicks), String(urlClicks), String(bookmarks)].join(','));
    }
  }
  return [header, ...rows].join('\n');
}

/** 生成 Overview CSV（每日汇总）。 */
export function generateDemoOverviewCsv(seed = 20261025, days = 60, endOffsetDays = 0): string {
  const rand = mulberry32(seed + 7);
  const header = 'Date,Impressions,Likes,Replies,Reposts,Quotes,Profile Visits,Follows,Unfollows,Mentions';
  const rows: string[] = [];
  const end = new Date(Date.now() - endOffsetDays * DAY_MS);
  end.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(end.getTime() - (days - 1 - i) * DAY_MS);
    const weekday = dayDate.getDay();
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.7 : 1;
    const recentPhase = i >= days - 14;
    const phase = recentPhase ? 0.75 : 1;
    const dateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

    const impressions = Math.round(6500 * weekendFactor * phase * (0.7 + rand() * 0.6));
    const likes = Math.round(impressions * 0.03 * (0.7 + rand() * 0.5));
    const replies = Math.round(impressions * 0.004 * (0.5 + rand()));
    const reposts = Math.round(impressions * 0.008 * (0.5 + rand()));
    const quotes = Math.round(impressions * 0.0015 * rand());
    const profileVisits = Math.round(impressions * 0.05 * (0.6 + rand()));
    const follows = Math.max(0, Math.round((weekendFactor * (1 + rand() * 4)) * (recentPhase ? 0.8 : 1)));
    const unfollows = Math.max(0, Math.round(rand() * 2.5));
    const mentions = Math.round(impressions * 0.002 * rand());
    rows.push([dateKey, String(impressions), String(likes), String(replies), String(reposts), String(quotes), String(profileVisits), String(follows), String(unfollows), String(mentions)].join(','));
  }
  return [header, ...rows].join('\n');
}
