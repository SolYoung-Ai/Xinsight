import { parseCsvText } from '../src/services/import/csv';
import { autoMap } from '../src/services/import/fields';
import { buildFileInfo, transformContent, transformOverview } from '../src/services/import/transform';
import type { Dataset } from '../src/types';

export function buildDataset(contentCsv?: string, overviewCsv?: string): Dataset {
  const contentParse = contentCsv ? parseCsvText(contentCsv) : null;
  const overviewParse = overviewCsv ? parseCsvText(overviewCsv) : null;
  const contentMapping = contentParse ? autoMap(contentParse.headers) : {};
  const overviewMapping = overviewParse ? autoMap(overviewParse.headers) : {};

  const contentOut = contentParse ? transformContent(contentParse, contentMapping) : null;
  const overviewOut = overviewParse ? transformOverview(overviewParse, overviewMapping) : null;

  return {
    content: contentOut?.records ?? [],
    overview: overviewOut?.records ?? [],
    contentFile: contentParse && contentOut ? buildFileInfo('content', 'content.csv', contentParse, contentOut, false) : null,
    overviewFile: overviewParse && overviewOut ? buildFileInfo('overview', 'overview.csv', overviewParse, overviewOut, false) : null,
    mapping: { content: contentMapping, overview: overviewMapping },
    importedAt: new Date().toISOString(),
  };
}

export const SAMPLE_CONTENT = `tweet id,tweet permalink,tweet text,time,impressions,engagements,engagement rate,retweets,replies,likes,user profile clicks,url clicks,bookmarks
1001,https://x.com/u/status/1001,"Post A",2025-03-01 09:00,1000,50,5.00%,2,3,20,4,5,10
1002,https://x.com/u/status/1002,"Post B",2025-03-02 10:00,800,40,5.00%,1,2,15,3,4,8
1003,https://x.com/u/status/1003,"Post C",2025-03-03 11:00,1200,60,5.00%,3,4,25,5,6,12
1004,https://x.com/u/status/1004,"Post D",2025-03-04 12:00,600,30,5.00%,1,1,10,2,3,5
1005,https://x.com/u/status/1005,"Post E",2025-03-05 13:00,3000,150,5.00%,10,15,60,12,20,30
1006,https://x.com/u/status/1006,"Post F",2025-03-06 14:00,500,20,4.00%,1,1,8,2,2,4
1007,https://x.com/u/status/1007,"Post G",2025-03-07 15:00,700,35,5.00%,2,2,12,3,4,6
1008,https://x.com/u/status/1008,"Post H",2025-03-08 16:00,900,45,5.00%,2,3,15,4,5,7
1009,https://x.com/u/status/1009,"Post I",2025-03-09 17:00,1100,55,5.00%,3,3,18,5,6,9
1010,https://x.com/u/status/1010,"Post J",2025-03-10 18:00,1300,65,5.00%,4,4,22,6,7,11
1011,https://x.com/u/status/1011,"Post K",2025-03-11 19:00,1500,75,5.00%,5,5,26,7,8,13
1012,https://x.com/u/status/1012,"Post L",2025-03-12 20:00,1700,85,5.00%,6,6,30,8,9,15`;

export const SAMPLE_OVERVIEW = `Date,Impressions,Likes,Replies,Reposts,Quotes,Profile Visits,Follows,Unfollows,Mentions
2025-03-01,1100,55,5,8,2,90,4,1,3
2025-03-02,900,45,4,6,1,80,3,1,2
2025-03-03,1300,65,6,9,2,100,5,2,3
2025-03-04,700,35,3,5,1,70,3,1,2
2025-03-05,3200,160,15,20,5,200,8,1,4
2025-03-06,600,30,3,4,1,60,2,1,1
2025-03-07,800,40,4,5,1,70,3,1,2
2025-03-08,1000,50,5,7,1,85,4,2,2
2025-03-09,1200,60,6,8,2,95,5,1,3
2025-03-10,1400,70,7,9,2,110,6,2,3
2025-03-11,1600,80,8,10,2,120,7,1,4
2025-03-12,1800,90,9,11,3,130,8,2,4`;
