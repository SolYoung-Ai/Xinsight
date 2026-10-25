import { useMemo, useState } from 'react';
import { Crown, ExternalLink, MessageSquare, Search, Trophy } from 'lucide-react';
import { useData } from '../state/DataContext';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/State';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { BarChart } from '../components/charts/Charts';
import { chartPalette } from '../components/charts/theme';
import type { ContentPost } from '../types';
import { fmtDate, fmtDateTime } from '../utils/date';
import { fmtCompact, fmtPercent } from '../utils/format';
import { median } from '../utils/math';
import { THRESHOLDS } from '../services/analytics/thresholds';
import uiStyles from '../styles/ui.module.css';
import styles from './PostsPage.module.css';

function postLink(p: ContentPost): string | null {
  if (p.url) return p.url;
  if (p.postId && /^\d+$/.test(p.postId)) return `https://x.com/i/web/status/${p.postId}`;
  return null;
}

interface SortDef {
  key: string;
  label: string;
  get: (p: ContentPost) => number | null;
  desc?: boolean;
  unavailable?: boolean;
}

export function PostsPage() {
  const { dataset, range, theme } = useData();
  const palette = chartPalette(theme);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('impressions');
  const [rankTab, setRankTab] = useState('impressions');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ContentPost | null>(null);
  const PAGE_SIZE = 15;

  const postsInRange = useMemo(() => {
    if (!dataset || !range) return [];
    return dataset.content
      .filter((p) => p.date && p.date >= range.start && p.date <= range.end)
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  }, [dataset, range]);

  const hasImp = useMemo(() => postsInRange.some((p) => p.impressions !== null), [postsInRange]);
  const hasEng = useMemo(() => postsInRange.some((p) => p.computedEngagements !== null), [postsInRange]);
  const hasLike = useMemo(() => postsInRange.some((p) => p.likes !== null), [postsInRange]);
  const hasBook = useMemo(() => postsInRange.some((p) => p.bookmarks !== null), [postsInRange]);
  const hasReply = useMemo(() => postsInRange.some((p) => p.replies !== null), [postsInRange]);

  /** 不含回复的互动量 = 点赞+转发+引用+收藏（与互动量同口径，仅剔除回复） */
  const nonReplyEng = (p: ContentPost): number | null => {
    const parts = [p.likes, p.reposts, p.quotes, p.bookmarks].filter((v): v is number => v !== null);
    return parts.length === 0 ? null : parts.reduce((a, b) => a + b, 0);
  };

  const sorts: SortDef[] = [
    { key: 'impressions', label: '曝光量', get: (p) => p.impressions, unavailable: !hasImp },
    { key: 'engagements', label: '互动量', get: (p) => p.computedEngagements, unavailable: !hasEng },
    { key: 'engNoReply', label: '互动量(不含回复)', get: (p) => nonReplyEng(p), unavailable: !hasEng },
    { key: 'engagementRate', label: '互动率', get: (p) => p.computedEngagementRate, unavailable: !hasEng || !hasImp },
    { key: 'likes', label: '点赞量', get: (p) => p.likes, unavailable: !hasLike },
    { key: 'bookmarks', label: '收藏量', get: (p) => p.bookmarks, unavailable: !hasBook },
    { key: 'replies', label: '回复量', get: (p) => p.replies, unavailable: !hasReply },
  ];
  const activeSort = sorts.find((s) => s.key === sortKey) ?? sorts[0];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? postsInRange.filter((p) => p.text.toLowerCase().includes(q) || (p.postId ?? '').includes(q))
      : postsInRange;
    const get = activeSort.get;
    return [...list].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return vb - va;
    });
  }, [postsInRange, search, activeSort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 分布
  const distribution = useMemo(() => {
    const buckets = [
      { label: '0 – 1k', min: 0, max: 1000 },
      { label: '1k – 5k', min: 1000, max: 5000 },
      { label: '5k – 10k', min: 5000, max: 10000 },
      { label: '10k – 50k', min: 10000, max: 50000 },
      { label: '50k – 100k', min: 50000, max: 100000 },
      { label: '100k+', min: 100000, max: Infinity },
    ];
    return buckets.map((b) => ({
      label: b.label,
      count: postsInRange.filter((p) => p.impressions !== null && p.impressions >= b.min && p.impressions < b.max).length,
    }));
  }, [postsInRange]);

  const med = useMemo(() => median(postsInRange.map((p) => p.impressions)), [postsInRange]);

  const topPost = useMemo(
    () => postsInRange.filter((p) => p.impressions !== null).sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))[0] ?? null,
    [postsInRange],
  );
  const bottomPost = useMemo(
    () => postsInRange.filter((p) => p.impressions !== null).sort((a, b) => (a.impressions ?? 0) - (b.impressions ?? 0))[0] ?? null,
    [postsInRange],
  );

  const rankList = useMemo(() => {
    const s = sorts.find((x) => x.key === rankTab) ?? sorts[0];
    if (s.unavailable) return null;
    const list = postsInRange
      .filter((p) => s.get(p) !== null)
      .sort((a, b) => {
        const va = s.get(a)!;
        const vb = s.get(b)!;
        return vb - va;
      })
      .slice(0, 5);
    return { sort: s, list };
  }, [rankTab, postsInRange, sorts]);

  const rankTabs = sorts.filter((s) => !s.unavailable);

  if (!dataset || !range) {
    return <EmptyState title="暂无数据" desc="导入 Content CSV 后可查看内容表现分析。" />;
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHeader title="内容表现 Posts" desc="什么样的帖子表现更好：排行、筛选、分布与差异对比" />

      <Card>
        <CardHeader
          title="帖子排行榜"
          sub="仅展示存在数据支持的排序方式；未映射的指标不会出现"
          right={
            <div className={uiStyles.tabs}>
              {rankTabs.map((s) => (
                <button
                  key={s.key}
                  className={[uiStyles.tab, rankTab === s.key ? uiStyles.tabActive : ''].join(' ')}
                  onClick={() => setRankTab(s.key)}
                >
                  {s.label}最高
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          {rankList && rankList.list.length > 0 ? (
            <div className={styles.rankList}>
              {rankList.list.map((p, i) => (
                <button key={p.rowIndex} className={styles.rankItem} onClick={() => setDetail(p)}>
                  <span className={i === 0 ? styles.rankNo1 : styles.rankNo}>
                    {i === 0 ? <Crown size={15} /> : i + 1}
                  </span>
                  <span className={styles.rankText}>{p.text.slice(0, 80) || '（无正文）'}</span>
                  <span className={styles.rankDate}>{p.date ? fmtDate(p.date) : '—'}</span>
                  <span className={styles.rankVal}>{fmtCompact(rankList.sort.get(p))}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="该排序方式暂无数据" desc="当前范围内没有可用于该指标排序的帖子。" />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`帖子列表（${filtered.length} 条）`}
          sub={range ? `${range.start.getFullYear()}-${String(range.start.getMonth() + 1).padStart(2, '0')}-${String(range.start.getDate()).padStart(2, '0')} ~ ${range.end.getFullYear()}-${String(range.end.getMonth() + 1).padStart(2, '0')}-${String(range.end.getDate()).padStart(2, '0')}` : undefined}
          right={
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <div className={uiStyles.field} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Search size={15} style={{ color: 'var(--text-3)' }} />
                <input
                  className={uiStyles.input}
                  style={{ width: 200 }}
                  placeholder="搜索正文或帖子 ID…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <select
                className={uiStyles.select}
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value);
                  setPage(1);
                }}
              >
                {sorts.map((s) => (
                  <option key={s.key} value={s.key} disabled={s.unavailable}>
                    {s.label}排序{s.unavailable ? '（不可用）' : ''}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        <CardBody>
          {filtered.length === 0 ? (
            <EmptyState title="没有匹配的帖子" desc="调整搜索关键词或时间范围后重试。" />
          ) : (
            <>
              <div className={uiStyles.tableWrap}>
                <table className={[uiStyles.table, uiStyles.tableRowHover].join(' ')}>
                  <thead>
                    <tr>
                      <th>正文</th>
                      <th style={{ width: 110 }}>日期</th>
                      {hasImp ? <th className="num" style={{ textAlign: 'right' }}>曝光</th> : null}
                      {hasLike ? <th className="num" style={{ textAlign: 'right' }}>点赞</th> : null}
                      {hasReply ? <th className="num" style={{ textAlign: 'right' }}>回复</th> : null}
                      <th className="num" style={{ textAlign: 'right' }}>转发</th>
                      {hasBook ? <th className="num" style={{ textAlign: 'right' }}>收藏</th> : null}
                      {hasEng ? <th className="num" style={{ textAlign: 'right' }}>互动量</th> : null}
                      {hasEng ? (
                        <th className="num" style={{ textAlign: 'right' }} title="点赞+转发+引用+收藏，不含回复">
                          互动量(不含回复)
                        </th>
                      ) : null}
                      {hasEng && hasImp ? <th className="num" style={{ textAlign: 'right' }}>互动率</th> : null}
                      <th style={{ width: 44 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((p) => {
                      const link = postLink(p);
                      return (
                        <tr key={p.rowIndex} onClick={() => setDetail(p)} style={{ cursor: 'pointer' }}>
                          <td>
                            <div className={styles.cellText}>{p.text.slice(0, 120) || '（无正文）'}</div>
                          </td>
                          <td className="small muted num">{p.date ? fmtDate(p.date) : '—'}</td>
                          {hasImp ? <td className="num" style={{ textAlign: 'right' }}>{fmtCompact(p.impressions)}</td> : null}
                          {hasLike ? <td className="num" style={{ textAlign: 'right' }}>{fmtCompact(p.likes)}</td> : null}
                          {hasReply ? <td className="num" style={{ textAlign: 'right' }}>{fmtCompact(p.replies)}</td> : null}
                          <td className="num" style={{ textAlign: 'right' }}>{fmtCompact(p.reposts)}</td>
                          {hasBook ? <td className="num" style={{ textAlign: 'right' }}>{fmtCompact(p.bookmarks)}</td> : null}
                          {hasEng ? <td className="num" style={{ textAlign: 'right' }}>{fmtCompact(p.computedEngagements)}</td> : null}
                          {hasEng ? (
                            <td className="num" style={{ textAlign: 'right' }} title="点赞+转发+引用+收藏，不含回复">
                              {fmtCompact(nonReplyEng(p))}
                            </td>
                          ) : null}
                          {hasEng && hasImp ? (
                            <td className="num" style={{ textAlign: 'right' }}>{p.computedEngagementRate !== null ? fmtPercent(p.computedEngagementRate, 1) : '—'}</td>
                          ) : null}
                          <td>
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="在 X 打开原帖"
                                title="在 X 打开原帖"
                              >
                                <ExternalLink size={14} />
                              </a>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                <span className="small muted">
                  共 {filtered.length} 条 · 第 {page}/{pageCount} 页
                </span>
                <Pagination page={page} pageCount={pageCount} onChange={setPage} />
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-2">
        <Card>
          <CardHeader title="曝光量分布" sub="单帖曝光区间分布（仅曝光数据可用时显示）" />
          <CardBody>
            {!hasImp ? (
              <EmptyState title="曝光指标不可用" desc="需要 Content CSV 的曝光量字段。" />
            ) : (
              <BarChart
                labels={distribution.map((d) => d.label)}
                palette={palette}
                height={240}
                series={[{ label: '帖子数', data: distribution.map((d) => d.count) }]}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="高表现 vs 普通表现"
            sub={`高表现定义：单帖曝光 ≥ 中位数 × ${THRESHOLDS.highPerformerMultiple}`}
          />
          <CardBody>
            {!hasImp || med === null ? (
              <EmptyState title="曝光指标不可用" desc="需要 Content CSV 的曝光量字段。" />
            ) : (
              <div className="grid grid-2">
                <div className={styles.vsCard}>
                  <Badge tone="accent">高表现</Badge>
                  <div className={styles.vsValue}>{postsInRange.filter((p) => p.impressions !== null && p.impressions >= med * THRESHOLDS.highPerformerMultiple).length} 条</div>
                  <div className="small muted">占有效帖子 {Math.round((postsInRange.filter((p) => p.impressions !== null && p.impressions >= med * THRESHOLDS.highPerformerMultiple).length / Math.max(1, postsInRange.filter((p) => p.impressions !== null).length)) * 100)}%</div>
                </div>
                <div className={styles.vsCard}>
                  <Badge tone="muted">普通表现</Badge>
                  <div className={styles.vsValue}>{postsInRange.filter((p) => p.impressions !== null && p.impressions < med * THRESHOLDS.highPerformerMultiple).length} 条</div>
                  <div className="small muted">曝光中位数 {fmtCompact(med)}</div>
                </div>
              </div>
            )}
            <div className={styles.vsNote}>
              不要把一次爆款直接解释为稳定规律；样本量足够时可结合分位数与分布判断内容表现差异。
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="表现最好 vs 表现较弱" sub="按单帖曝光量取当前范围内最高与最低记录（仅曝光数据可用时）" />
        <CardBody>
          {!topPost || !bottomPost || topPost.rowIndex === bottomPost.rowIndex ? (
            <EmptyState title="数据不足以对比" desc="需要至少两条有效曝光记录。" />
          ) : (
            <div className="grid grid-2">
              <div className={styles.postCompare}>
                <div className="row">
                  <Trophy size={16} className="t-accent" />
                  <Badge tone="accent">最高曝光</Badge>
                </div>
                <div className={styles.compareText}>{topPost.text || '（无正文）'}</div>
                <div className="small muted">{topPost.date ? fmtDateTime(topPost.date) : '—'}</div>
                <div className="row" style={{ flexWrap: 'wrap', marginTop: 8, gap: 16 }}>
                  <span>曝光 <strong className="num">{fmtCompact(topPost.impressions)}</strong></span>
                  <span>点赞 <strong className="num">{fmtCompact(topPost.likes)}</strong></span>
                  <span>互动率 <strong className="num">{topPost.computedEngagementRate !== null ? fmtPercent(topPost.computedEngagementRate, 1) : '—'}</strong></span>
                </div>
                {postLink(topPost) ? (
                  <a href={postLink(topPost)!} target="_blank" rel="noopener noreferrer" className="small">
                    查看原帖 <ExternalLink size={11} style={{ verticalAlign: -1 }} />
                  </a>
                ) : null}
              </div>
              <div className={styles.postCompare}>
                <div className="row">
                  <MessageSquare size={16} className="muted" />
                  <Badge tone="outline">较低曝光</Badge>
                </div>
                <div className={styles.compareText}>{bottomPost.text || '（无正文）'}</div>
                <div className="small muted">{bottomPost.date ? fmtDateTime(bottomPost.date) : '—'}</div>
                <div className="row" style={{ flexWrap: 'wrap', marginTop: 8, gap: 16 }}>
                  <span>曝光 <strong className="num">{fmtCompact(bottomPost.impressions)}</strong></span>
                  <span>点赞 <strong className="num">{fmtCompact(bottomPost.likes)}</strong></span>
                  <span>互动率 <strong className="num">{bottomPost.computedEngagementRate !== null ? fmtPercent(bottomPost.computedEngagementRate, 1) : '—'}</strong></span>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={detail !== null} title="帖子详情" onClose={() => setDetail(null)} wide>
        {detail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="small muted" style={{ marginBottom: 6 }}>
                {detail.date ? fmtDateTime(detail.date) : '日期不可用'}
                {detail.postId ? ` · ID ${detail.postId}` : ''}
                {detail.rawDate ? ` · 原始时间「${detail.rawDate}」` : ''}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{detail.text || '（无正文）'}</div>
            </div>
            <div className="grid grid-3">
              {[
                ['曝光量', detail.impressions],
                ['点赞', detail.likes],
                ['回复', detail.replies],
                ['转发', detail.reposts],
                ['引用', detail.quotes],
                ['收藏', detail.bookmarks],
                ['互动量（计算）', detail.computedEngagements],
                ['其中不含回复', nonReplyEng(detail)],
                ['互动率', detail.computedEngagementRate !== null ? fmtPercent(detail.computedEngagementRate, 2) : null],
                ['主页访问', detail.profileVisits],
                ['新增关注', detail.follows],
                ['链接点击', detail.urlClicks],
              ].map(([k, v]) => (
                <div key={String(k)} className={styles.detailItem}>
                  <div className="small muted">{k}</div>
                  <div className="num" style={{ fontWeight: 650 }}>{v === null || v === undefined ? '不可用' : typeof v === 'number' ? fmtCompact(v) : v}</div>
                </div>
              ))}
            </div>
            {postLink(detail) ? (
              <div>
                <a href={postLink(detail)!} target="_blank" rel="noopener noreferrer" className="small">
                  在 X 打开原帖（新标签页） <ExternalLink size={12} style={{ verticalAlign: -2 }} />
                </a>
              </div>
            ) : null}
            <p className="small muted" style={{ margin: 0 }}>
              帖子正文始终以纯文本展示，不会执行其中的任何脚本或 HTML。
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
