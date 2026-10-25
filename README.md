# X Account Insight（X 账号数据体检）

独立第三方工具：导入你自己导出的 X 分析页 CSV，在浏览器本地完成曝光、互动、发帖频率与数据质量分析，输出可解释的运营观察报告。**本项目与 X Corp. 无隶属关系，不代表 X 官方结论。**

- 纯前端 + 浏览器本地计算：不上传数据、不接 X API、无后端、无数据库、无付费 AI。
- 双 CSV 导入：Content CSV（单帖表现）+ Overview CSV（每日整体表现）。
- 七个模块：总览 Dashboard / 内容表现 Posts / 流量趋势 Trends / 发帖分析 Publishing / 数据诊断 Diagnostics / 分析报告 Reports / 数据管理 Data。
- 可直接部署到 GitHub Pages。

## 功能说明

| 模块 | 能力 |
|---|---|
| 总览 | 总曝光、日均曝光、单帖均值/中位数、互动量、互动率、净增粉丝；7/30/90 天与自定义范围；前后等长周期对比 |
| 内容表现 | 曝光/互动/互动率/点赞/收藏/回复排行；搜索、排序、分页、详情、安全外链；曝光分布与高/弱表现对比 |
| 流量趋势 | 日/周曝光、单帖曝光中位数、互动、主页访问、关注/取关/净增趋势；统计规则波动提示（仅描述数据现象） |
| 发帖分析 | 周均发帖变化、星期/小时分布、高表现时段（样本阈值内）、每项建议附「现象-数据-行动-局限」 |
| 数据诊断 | 数据完整性检查（字段缺失、日期缺口、重复、负数、0 曝光、双文件范围一致、样本量）；结果等级：数据充分/需要观察/样本不足/数据异常/指标不可用 |
| 分析报告 | 导出统计摘要、分析后 CSV、Markdown 报告；打印友好页面（可存 PDF）；含免责声明与数据来源标注 |
| 数据管理 | 文件列表、字段映射重开、重新导入、移除单文件、清除全部数据；可选浏览器本地保存（默认关闭） |

## 本地运行

```bash
npm install
npm run dev          # 开发服务器 http://localhost:5173
```

## 构建与测试

```bash
npm run typecheck    # TypeScript 类型检查
npm test             # Vitest 自动化测试（78 个用例）
npm run build        # 类型检查 + 生产构建，产物输出到 dist/
npm run preview      # 本地预览构建产物
```

## GitHub Pages 部署

仓库：`SolYoung-Ai/x-account-insight`，站点地址：<https://solyoung-ai.github.io/x-account-insight/>

### 当前部署状态（已验证上线）

- 站点已通过 **gh-pages 分支**（`build_type: legacy`）部署并验证可访问（首页与资源均返回 200）。
- 部署流程：`npm run build` → 将 `dist/` 提交到 `gh-pages` 分支 → 仓库 **Settings → Pages** 源选择该分支（已配置）。

### 自动部署（GitHub Actions，推荐）

仓库内置工作流 `.github/workflows/deploy.yml`：推送 `main` 后自动执行 `npm ci` → 类型检查 → 测试 → 构建 → 部署。启用方式：

1. 给推送用 Personal Access Token 增加 **workflow** 权限（或安装 gh CLI 重新登录授权）。
2. 重新提交 `git add .github/workflows/deploy.yml && git commit -m "ci: enable actions deployment" && git push`。
3. 在仓库 **Settings → Pages** 将 **Build and deployment / Source** 改为 **GitHub Actions**，此后以 Actions 为准。

> 说明：因当前 PAT 无 workflow 权限，GitHub 会拒绝推送含 `.github/workflows/` 的提交；源码已推送至 `main`，工作流文件保留在本地仓库（未被提交）。授权后按上述步骤即可启用。

Vite 已配置 `base: './'`，构建产物使用相对路径：既支持子路径部署，也支持后续绑定自定义域名（无需改代码，只需在仓库 Settings → Pages → Custom domain 配置）。

## 数据导入说明

1. 在 X 分析页（Analytics）导出数据：**Content** 标签导出单帖 CSV，**Overview** 标签导出每日 CSV。
2. 进入本工具的「数据管理 / 导入」页，分别上传两个文件（只上传其中一个也可以，但会明确提示哪些分析功能不可用）。
3. 上传后展示文件预览与字段识别结果；识别失败时可手动指定字段映射，无需重新上传。
4. 也可点击「加载演示数据」体验全部功能——演示数据有明确标注，不会与真实数据混淆，也不会写入报告导出。

常见可识别字段（中英文表头均可）：

- 帖子：Post ID、Post URL、Post Text、Date/Time、Impressions、Likes、Replies、Reposts/Retweets、Quotes、Bookmarks、Profile Visits、Follows 等
- 每日：Date、Impressions、Likes、Replies、Reposts、Profile Visits、Follows、Unfollows、Mentions 等

## 统计指标解释（本工具口径）

- **互动量**：点赞 + 回复 + 转发 + 引用 + 收藏中「实际存在字段」的合计；存在整体 engagements 字段时按分量重新求和，避免重复计数。
- **互动率** = 可用互动量合计 ÷ 曝光量合计 × 100%。分母为 0/缺失时显示「无法计算」。这是本工具按可用字段计算的指标，不保证与 X 内部分析页面所有口径完全一致。
- **净增粉丝** = 新增关注 − 取消关注；仅当两个字段都存在时计算，否则只展示「部分」数据并明确标注。
- **变化率** =（当前周期 − 上一周期）÷ 上一周期 × 100%；上一周期为 0 或样本不足时显示「无法比较」。
- **缺失值**：区分真正的 0、未导出、缺失值、解析错误、无法计算，不会把缺失当作 0 填充。
- **周期对比**：每个周期至少 5 条帖子才提示变化（建议 10 条）；不足时仅展示原始数据，不给确定性结论。
- **波动提示**：仅描述「观察到曝光中位数下降 X%」这类数据现象，不推断原因，更不判定限流/封禁/降权。

## 隐私说明

- 所有导入文件默认只在当前浏览器内存中解析与计算，**不上传任何服务器**。
- 无追踪像素、无隐藏遥测、无第三方分析。
- 不读取 Cookie、不要求 X 登录凭据、不抓取 X 网页或调用私有接口。
- 页面刷新/关闭后默认清除本次会话数据；如需保留分析记录，可在「数据管理」主动开启浏览器本地保存（仅存于当前浏览器，清除浏览器数据后无法恢复）。
- 「清除所有数据」会同时清理内存记录、图表缓存与本地保存数据。
- 原始数据不会写入任何公开仓库、日志或构建产物。

## 项目限制

- 第一版只做「真实数据 + 透明计算 + 可解释建议」，**不**检测、不宣称、不暗示 Shadowban / 限流 / 封禁 / 账号评分 / 风控状态。
- 不判断用户是否违反 X 平台规则，不冒充 X 官方算法。
- 发帖时间分析仅基于真实时间戳，样本不足时不推断「最佳发布时间」。
- 演示数据仅供验证交互，不得当作真实账号数据使用或导出。

## 开源依赖与许可证

本项目使用 MIT 许可证。主要依赖（均已核对许可证，均为开源宽松许可）：

| 依赖 | 用途 | 许可证 |
|---|---|---|
| react / react-dom | UI 框架 | MIT |
| react-router-dom | 静态兼容路由（HashRouter） | MIT |
| chart.js / react-chartjs-2 | 图表 | MIT |
| papaparse | CSV 解析 | MIT |
| lucide-react | 图标 | ISC |
| vite / typescript / vitest | 构建与测试 | MIT |

产品思路参考（仅借鉴产品与数据结构思路，未复制代码）：

- [x-growth-dashboard](https://github.com/AM1403x/x-growth-dashboard)（MIT）—— Content + Overview 双 CSV 输入、单帖/每日双口径分析
- [growthmate](https://github.com/ibrahimahmed/growthmate)（MIT）—— 产品功能清单（仪表盘、周期比较、互动构成、粉丝增长）

## 常见错误排查

| 现象 | 处理 |
|---|---|
| 导入后大量行被跳过 | 在「数据管理」查看跳过原因（空行/缺日期/重复）；检查字段映射是否正确 |
| 某指标显示「指标不可用」 | 原文件缺少对应字段，或字段映射未指定；不满足条件时不强行计算 |
| 图表空白/断开 | 所选日期范围超出数据覆盖，或数据存在日期缺口；缺失日期不会补零 |
| GitHub Pages 404 | 检查仓库 Settings → Pages → Source 是否为 GitHub Actions，且工作流已成功运行 |
| 子路径资源加载失败 | 确认构建使用 `base: './'`（本项目已配置），部署后刷新一次 |
| 日期解析失败 | X 导出默认时间格式已兼容；若为自定义格式可在字段映射中调整日期列 |
| 本地端口冲突 | `npm run dev` 会自动换端口；或手动指定 `vite --port 5174` |

## 如何清除本地数据

「数据管理」页 →「清除所有数据」：一次确认即可，同时清理内存记录、图表缓存、临时变量与本地保存数据；也可在浏览器设置中清除本站 localStorage（清除后本地保存不可恢复）。

---

免责声明：本产品为独立第三方项目，与 X Corp. 无隶属关系，不代表 X 官方结论。所有分析均基于用户主动导入的数据，结论仅描述数据现象。
