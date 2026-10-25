import { describe, expect, it } from 'vitest';
import { parseCsvText } from '../src/services/import/csv';
import { autoMap } from '../src/services/import/fields';
import { buildFileInfo, transformContent, transformOverview } from '../src/services/import/transform';

const p = (csv: string) => parseCsvText(csv);

const CONTENT_CSV = `tweet id,tweet permalink,tweet text,time,impressions,engagements,engagement rate,retweets,replies,likes,user profile clicks,url clicks,bookmarks
1810000000000000001,https://x.com/u/status/1810000000000000001,"Hello, world! ""quoted"" line
second line",2025-03-06 14:33,1200,56,4.67%,2,1,10,5,3,7
1810000000000000002,https://x.com/u/status/1810000000000000002,"Second post",2025-03-07 10:00,800,30,3.75%,1,2,8,4,1,3
1810000000000000003,https://x.com/u/status/1810000000000000003,"Third post",2025-03-07 20:00,400,10,2.50%,0,0,2,1,0,0`;

const OVERVIEW_CSV = `Date,Impressions,Likes,Replies,Reposts,Quotes,Profile Visits,Follows,Unfollows,Mentions
2025-03-06,5000,120,8,20,2,300,5,1,3
2025-03-07,4200,90,6,15,1,260,4,2,2
2025-03-08,6000,140,10,25,3,330,6,0,4`;

describe('CSV 解析基础', () => {
  it('解析正常文件：表头与行数', () => {
    const parse = p(CONTENT_CSV);
    expect(parse.rowCount).toBe(3);
    expect(parse.headers).toContain('tweet text');
    expect(parse.errors.length).toBe(0);
  });

  it('空文件解析为 0 行', () => {
    const parse = p('');
    expect(parse.rowCount).toBe(0);
    expect(parse.headers.length).toBe(0);
  });

  it('含逗号、引号、换行的正文被完整保留', () => {
    const parse = p(CONTENT_CSV);
    const row = parse.rows[0];
    expect(row['tweet text']).toContain('Hello, world!');
    expect(row['tweet text']).toContain('"quoted"');
    expect(row['tweet text']).toContain('\nsecond line');
  });
});

describe('Content 转换', () => {
  it('正常转换：记录数、指标、互动计算、日期', () => {
    const parse = p(CONTENT_CSV);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    expect(out.parsedCount).toBe(3);
    expect(out.skippedCount).toBe(0);
    expect(out.duplicateCount).toBe(0);
    const first = out.records[0];
    expect(first.postId).toBe('1810000000000000001');
    expect(first.impressions).toBe(1200);
    expect(first.likes).toBe(10);
    // 互动量 = 点赞+回复+转发+收藏（不含 url clicks / profile clicks）
    expect(first.computedEngagements).toBe(10 + 1 + 2 + 7);
    expect(first.computedEngagementRate).toBeCloseTo((20 / 1200) * 100, 5);
    expect(first.engagementRate).toBe(4.67);
    expect(out.dateMin).toBe('2025-03-06');
    expect(out.dateMax).toBe('2025-03-07');
  });

  it('缺失曝光量字段：曝光为 null 而非 0', () => {
    const csv = `tweet id,tweet text,time,likes
1,"no impressions",2025-03-06,5`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    expect(out.records[0].impressions).toBeNull();
    expect(out.records[0].likes).toBe(5);
    expect(out.records[0].computedEngagements).toBe(5);
  });

  it('缺失日期：记录保留但 date 为 null', () => {
    const csv = `tweet id,tweet text,impressions
1,"no date",100`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    expect(out.parsedCount).toBe(1);
    expect(out.records[0].date).toBeNull();
    expect(out.dateMin).toBeNull();
  });

  it('重复记录去重', () => {
    const csv = `tweet id,tweet text,time,impressions
1,"dup",2025-03-06,100
1,"dup",2025-03-06,100
2,"other",2025-03-07,200`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    expect(out.parsedCount).toBe(2);
    expect(out.duplicateCount).toBe(1);
    expect(out.skipReasons.some((r) => r.reason.includes('重复'))).toBe(true);
  });

  it('所有曝光量为 0：总曝光为 0（有效值）', () => {
    const csv = `tweet id,tweet text,time,impressions,likes
1,"a",2025-03-06,0,1
2,"b",2025-03-07,0,0`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    expect(out.records.every((r) => r.impressions === 0)).toBe(true);
    expect(out.issues.zeroImpressionsCount).toBe(2);
  });

  it('整行为空的行被解析器过滤，不产生记录', () => {
    const csv = `tweet id,tweet text,time,impressions
1,"a",2025-03-06,100
,,,
2,"b",2025-03-07,200`;
    const parse = p(csv);
    // skipEmptyLines: 'greedy' 在解析层丢弃全空行
    expect(parse.rowCount).toBe(2);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    expect(out.parsedCount).toBe(2);
    expect(out.records.map((r) => r.postId)).toEqual(['1', '2']);
  });

  it('日期格式异常：date 为 null，且被记录', () => {
    const csv = `tweet id,tweet text,time,impressions
1,"bad",not-a-date,100`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    expect(out.records[0].date).toBeNull();
    expect(out.records[0].rawDate).toBe('not-a-date');
  });

  it('中文表头转换', () => {
    const csv = `帖子ID,帖子正文,发布时间,曝光量,点赞数,回复数,转发数,收藏数
1810000000000000002,测试内容,2025-03-07 10:00,800,15,2,3,1`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    expect(mapping.impressions).toBe('曝光量');
    const out = transformContent(parse, mapping);
    expect(out.parsedCount).toBe(1);
    expect(out.records[0].impressions).toBe(800);
    expect(out.records[0].likes).toBe(15);
    expect(out.records[0].computedEngagements).toBe(15 + 2 + 3 + 1);
  });

  it('负数被记录为问题', () => {
    const csv = `tweet id,tweet text,time,impressions,likes
1,"neg",2025-03-06,100,-5`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    expect(out.issues.negativeCount).toBe(1);
    expect(out.issues.negativeRows[0]).toBe(2);
  });
});

describe('Overview 转换', () => {
  it('正常转换与净增粉丝', () => {
    const parse = p(OVERVIEW_CSV);
    const mapping = autoMap(parse.headers);
    const out = transformOverview(parse, mapping);
    expect(out.parsedCount).toBe(3);
    expect(out.records[0].follows).toBe(5);
    expect(out.records[0].unfollows).toBe(1);
    expect(out.records[0].netFollowers).toBe(4);
  });

  it('仅新增关注（无取消关注）：netFollowers 为 null，不能冒充完整净增', () => {
    const csv = `Date,Impressions,Follows
2025-03-06,5000,5`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformOverview(parse, mapping);
    expect(out.records[0].netFollowers).toBeNull();
  });

  it('缺失日期行被跳过', () => {
    const csv = `Date,Impressions,Follows,Unfollows
2025-03-06,5000,5,1
not-a-date,100,1,0`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformOverview(parse, mapping);
    expect(out.parsedCount).toBe(1);
    expect(out.skippedCount).toBe(1);
    expect(out.skipReasons[0]?.reason).toContain('日期');
  });

  it('重复日期去重', () => {
    const csv = `Date,Impressions,Follows,Unfollows
2025-03-06,5000,5,1
2025-03-06,9999,9,9`;
    const parse = p(csv);
    const mapping = autoMap(parse.headers);
    const out = transformOverview(parse, mapping);
    expect(out.parsedCount).toBe(1);
    expect(out.duplicateCount).toBe(1);
  });
});

describe('文件信息', () => {
  it('buildFileInfo 汇总统计', () => {
    const parse = p(CONTENT_CSV);
    const mapping = autoMap(parse.headers);
    const out = transformContent(parse, mapping);
    const info = buildFileInfo('content', 'tweets.csv', parse, out, false);
    expect(info.parsedCount).toBe(3);
    expect(info.rowCount).toBe(3);
    expect(info.dateMin).toBe('2025-03-06');
    expect(info.isDemo).toBe(false);
    expect(info.rawHeaders).toContain('impressions');
  });
});
