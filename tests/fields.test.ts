import { describe, expect, it } from 'vitest';
import { autoMap, detectFileKind, normalizeHeader, recognizeField } from '../src/services/import/fields';

describe('字段识别', () => {
  it('归一化表头', () => {
    expect(normalizeHeader('User Profile Clicks')).toBe('userprofileclicks');
    expect(normalizeHeader('tweet_id')).toBe('tweetid');
    expect(normalizeHeader('Engagement Rate')).toBe('engagementrate');
  });

  it('识别 X 英文表头', () => {
    expect(recognizeField('tweet id')).toBe('postId');
    expect(recognizeField('tweet permalink')).toBe('postUrl');
    expect(recognizeField('tweet text')).toBe('postText');
    expect(recognizeField('time')).toBe('date');
    expect(recognizeField('impressions')).toBe('impressions');
    expect(recognizeField('likes')).toBe('likes');
    expect(recognizeField('replies')).toBe('replies');
    expect(recognizeField('retweets')).toBe('reposts');
    expect(recognizeField('quotes')).toBe('quotes');
    expect(recognizeField('bookmarks')).toBe('bookmarks');
    expect(recognizeField('user profile clicks')).toBe('profileVisits');
    expect(recognizeField('follows')).toBe('follows');
    expect(recognizeField('unfollows')).toBe('unfollows');
    expect(recognizeField('engagements')).toBe('engagements');
    expect(recognizeField('engagement rate')).toBe('engagementRate');
    expect(recognizeField('url clicks')).toBe('urlClicks');
    expect(recognizeField('mentions')).toBe('mentions');
  });

  it('识别中文表头', () => {
    expect(recognizeField('曝光量')).toBe('impressions');
    expect(recognizeField('点赞数')).toBe('likes');
    expect(recognizeField('回复数')).toBe('replies');
    expect(recognizeField('转发数')).toBe('reposts');
    expect(recognizeField('收藏数')).toBe('bookmarks');
    expect(recognizeField('发布时间')).toBe('date');
    expect(recognizeField('帖子正文')).toBe('postText');
    expect(recognizeField('新增关注')).toBe('follows');
    expect(recognizeField('取消关注')).toBe('unfollows');
    expect(recognizeField('主页访问')).toBe('profileVisits');
  });

  it('未知表头返回 null', () => {
    expect(recognizeField('随便写的列')).toBeNull();
    expect(recognizeField('')).toBeNull();
  });

  it('autoMap 对 X 内容表头完整映射', () => {
    const headers = [
      'tweet id', 'tweet permalink', 'tweet text', 'time', 'impressions',
      'engagements', 'engagement rate', 'retweets', 'replies', 'likes',
      'user profile clicks', 'url clicks', 'bookmarks',
    ];
    const m = autoMap(headers);
    expect(m.impressions).toBe('impressions');
    expect(m.postId).toBe('tweet id');
    expect(m.date).toBe('time');
    expect(m.engagementRate).toBe('engagement rate');
  });

  it('detectFileKind 区分内容与每日数据', () => {
    const contentHeaders = ['tweet id', 'tweet permalink', 'tweet text', 'time', 'impressions', 'likes'];
    const overviewHeaders = ['Date', 'Impressions', 'Likes', 'Replies', 'Reposts', 'Profile Visits', 'Follows', 'Unfollows'];
    expect(detectFileKind(contentHeaders, autoMap(contentHeaders))).toBe('content');
    expect(detectFileKind(overviewHeaders, autoMap(overviewHeaders))).toBe('overview');
  });
});
