/** 归一化后的规范化表头 → 语义字段的别名映射（小写、去空格/下划线/连字符/点）。 */

export type FieldKey =
  | 'postId'
  | 'postUrl'
  | 'postText'
  | 'date'
  | 'impressions'
  | 'likes'
  | 'replies'
  | 'reposts'
  | 'quotes'
  | 'bookmarks'
  | 'profileVisits'
  | 'follows'
  | 'unfollows'
  | 'engagements'
  | 'engagementRate'
  | 'urlClicks'
  | 'mentions';

export const FIELD_KEYS: FieldKey[] = [
  'postId', 'postUrl', 'postText', 'date', 'impressions', 'likes', 'replies',
  'reposts', 'quotes', 'bookmarks', 'profileVisits', 'follows', 'unfollows',
  'engagements', 'engagementRate', 'urlClicks', 'mentions',
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  postId: '帖子 ID',
  postUrl: '帖子链接',
  postText: '帖子正文',
  date: '日期 / 时间',
  impressions: '曝光量',
  likes: '点赞数',
  replies: '回复数',
  reposts: '转发数',
  quotes: '引用数',
  bookmarks: '收藏数',
  profileVisits: '主页访问量',
  follows: '新增关注',
  unfollows: '取消关注',
  engagements: '互动量',
  engagementRate: '互动率',
  urlClicks: '链接点击',
  mentions: '提及数',
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\s_\-./\\()（）\[\]]+/g, '')
    .replace(/[%％]+$/, '')
    .trim();

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  postId: ['tweetid', 'tweetidstr', 'postid', 'statusid', 'id'],
  postUrl: ['tweetpermalink', 'postpermalink', 'permalink', 'posturl', 'tweeturl', 'url'],
  postText: ['tweettext', 'posttext', 'tweet', 'status', 'post', 'text', 'content', '正文', '帖子内容', '帖子正文', '内容', '文案'],
  date: ['time', 'date', 'datetime', 'createdat', 'created', 'timestamp', 'datecreated', 'postedat', 'postdate', '发布时间', '日期', '时间', '发布日期', '日期时间'],
  impressions: ['impressions', 'impression', 'views', 'viewcount', 'exposure', '曝光量', '曝光', '展示量', '观看量'],
  likes: ['likes', 'like', 'likecount', 'favorites', 'favorite', 'favoritecount', 'favoritescount', 'hearts', 'heart', '点赞', '喜欢', '赞', '点赞数'],
  replies: ['replies', 'reply', 'replycount', 'comments', 'commentcount', '回复', '回复数', '评论', '评论数'],
  reposts: ['reposts', 'repost', 'repostcount', 'retweets', 'retweet', 'retweetcount', 'rt', '转发', '转发数', '转推', '转推数'],
  quotes: ['quotes', 'quote', 'quotecount', '引用', '引用数', '引文'],
  bookmarks: ['bookmarks', 'bookmark', 'bookmarkcount', 'saves', 'savecount', '收藏', '收藏数', '书签'],
  profileVisits: ['userprofileclicks', 'userprofileclick', 'profileclicks', 'profileclick', 'profilevisits', 'profilevisitscount', 'profilevisits', '个人主页访问', '主页访问', '主页访问量', '主页浏览量', '档案访问'],
  follows: ['follows', 'follow', 'newfollowers', 'followersgained', 'followergains', 'newfollows', '新增关注', '新增粉丝', '新关注', '粉丝增长'],
  unfollows: ['unfollows', 'unfollow', 'unfollowcount', '取消关注', '取关', '取消关注数'],
  engagements: ['engagements', 'engagement', 'engagementcount', 'interactions', 'interaction', '互动', '互动量', '互动次数'],
  engagementRate: ['engagementrate', 'engagementpct', 'engagementpercent', '互动率', '互动率%', 'engagement%'],
  urlClicks: ['urlclicks', 'urlclick', 'linkclicks', 'linkclick', 'clicks', '链接点击', '链接点击量'],
  mentions: ['mentions', 'mention', 'mentioncount', '提到', '提及', '提及数'],
};

const NORM_ALIASES: Record<FieldKey, string[]> = (() => {
  const out = {} as Record<FieldKey, string[]>;
  (Object.keys(FIELD_ALIASES) as FieldKey[]).forEach((k) => {
    out[k] = FIELD_ALIASES[k].map(norm);
  });
  return out;
})();

export const normalizeHeader = norm;

/**
 * 识别单个表头对应的语义字段。
 * 第一轮：归一化精确匹配；第二轮：包含匹配（较长别名优先，避免歧义）。
 */
export function recognizeField(header: string): FieldKey | null {
  const n = norm(header);
  if (!n) return null;
  for (const k of FIELD_KEYS) {
    if (NORM_ALIASES[k].includes(n)) return k;
  }
  let best: { key: FieldKey; len: number } | null = null;
  for (const k of FIELD_KEYS) {
    for (const alias of NORM_ALIASES[k]) {
      if (alias.length >= 3 && n.includes(alias)) {
        if (!best || alias.length > best.len) best = { key: k, len: alias.length };
      }
    }
  }
  return best ? best.key : null;
}

/** 对一组表头做整体识别，返回自动映射。 */
export function autoMap(headers: string[]): Partial<Record<FieldKey, string>> {
  const mapping: Partial<Record<FieldKey, string>> = {};
  const used = new Set<string>();
  for (const header of headers) {
    const key = recognizeField(header);
    if (key && !mapping[key] && !used.has(header)) {
      mapping[key] = header;
      used.add(header);
    }
  }
  return mapping;
}

/** 根据表头特征推断文件类型：content（单帖）或 overview（每日汇总）。 */
export function detectFileKind(headers: string[], mapping: Partial<Record<FieldKey, string>>): 'content' | 'overview' {
  const isPost = (mapping.postText || mapping.postId || mapping.postUrl) &&
    headers.some((x) => ['tweettext', 'tweetpermalink', 'tweetid', 'posttext', 'postid'].includes(norm(x)));
  if (isPost) return 'content';
  const hasDailyOnly = mapping.date && (mapping.follows || mapping.unfollows || mapping.mentions) && !mapping.postText && !mapping.postId;
  if (hasDailyOnly) return 'overview';
  if (headers.some((x) => ['tweetid', 'tweettext', 'tweetpermalink'].includes(norm(x)))) return 'content';
  return 'overview';
}
