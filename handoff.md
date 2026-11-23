# HANDOFF · 日刻 Daymark

最后更新：2026-11-23

下次会话请先读 `STATUS.md` 和本文件，再决定从哪条路线继续。不要重新实现已经完成的屏幕。

## 当前坐标

- 可运行的 H5 MVP 已完成：今日、收集箱、三步规划、专注、复盘、统计、设置。
- 代码在 `https://github.com/Blues9527/daily-mark`。
- PRD 在 `docs/daymark-prd.html`。
- 当前平台是 H5，不是微信小程序。
- 已有验证：`tsc`、12 个单测、7 组 Playwright E2E、生产构建全部通过。
- 首次进入是演示种子数据；设置里有「重置演示数据」。
- `?demo=1` 固定时钟为当天 10:12；不带参数用真实时间。

## 下次会话的第一件事

1. 进入项目并确认依赖：

```bash
git clone https://github.com/Blues9527/daily-mark.git
cd daily-mark
pnpm install
pnpm dev
```

2. 打开 `http://127.0.0.1:4173/?demo=1`，走一遍主流程：
   - 今日 → 移出 2 项
   - 收集 → 新增 / 编辑 / 删除
   - 重新规划 → 三步 → 完成今日规划
   - 开始专注 → 暂停 / 走神 / 部分完成
   - 复盘 → 归因 / 接受建议 / 保存
   - 设置 → 改容量 / 重置
3. 跑质量门禁：

```bash
pnpm exec tsc --noEmit
pnpm test
python3 e2e/test_app.py
pnpm run build
```

E2E 需要本机 Chrome 和已启动的 4173 dev server。

## 路线决策（需要用户确认）

### A. 移植微信小程序（如果最终产品必须是小程序）

建议先做一次 1 天以内的移植评估，再决定 Taro 还是原生：

- 审计平台依赖：`window`、`localStorage`、`100dvh`、`backdrop-filter`、`conic-gradient`、绝对定位时间轴、`<svg>`、`<input type="time">`。
- 领域层 `src/lib`、`src/types.ts`、`src/data` 与平台无关，优先抽成可复用 core。
- UI 层是 DOM/CSS，不能直接放进 WXML；Taro 可以复用 React 心智和大部分组件结构，但仍需把 `div/button/input` 换成 `View/Button/Input`，并处理 CSS 限制。
- 存储需要适配 `wx.setStorageSync` / 云数据库。
- 微信登录、订阅消息、云同步、数据导出/删除需要单独排期。
- 验收必须在微信开发者工具或真机进行；按 AGENTS 规则，启动模拟器前必须先获得允许。

### B. 先在 H5 上补齐产品闭环（如果当前目标是验证需求）

无论最终平台是什么，这些工作都能复用：

1. 正式 onboarding：昵称、每日容量、开始/结束时间；区分 demo 与真实用户。
2. 新用户空态：今日无计划、收集箱为空、首次复盘。
3. 埋点：按 PRD 事件表接入 `app_open`、`plan_start`、`plan_schedule_accept`、`block_start`、`focus_start`、`distraction_add`、`block_complete`、`block_reschedule`、`review_submit`、`streak_extend`。
4. 数据导出（JSON/Markdown）与「清空本机数据」。
5. 复盘口径与容量口径统一；补一个「今天还在进行中」的明确结束动作。
6. iOS Safari / 微信内置浏览器走查。

### C. 先做技术债清理（半天到一天）

- 统一「仪式块是否计入已排容量」的口径。
- 清理 `PlanFlow` 模块级 planMemory，改为 store 或可重置的 session 状态。
- 为 localStorage 增加 schema 版本迁移。
- 增加错误边界与基础错误上报。
- 初始化 git 仓库并提交当前基线；当前目录尚未 `git init`。

## 推荐顺序（没有新指令时）

1. 先做 C 的口径统一与 demo/真实数据分离。
2. 再做 B 的 onboarding + 空态 + 数据导出 + 埋点。
3. 用 5 位目标用户走查一轮，确认「容量」「留白」「三件事」是否被理解。
4. 再进入 A，避免把未验证的交互直接搬进小程序。

如果用户明确「就是要小程序，先跑起来」，则直接进入 A 的移植评估，不要继续打磨 H5 细节。

## 立即可执行的 5 个任务

- [ ] 运行应用与全部测试，确认当前基线没有回归。
- [ ] 决定下一里程碑：A 小程序 / B H5 闭环 / C 技术债。
- [ ] 如果选 B：新增 onboarding 数据模型与首次启动分支，保留 `?demo=1` 作为演示入口。
- [ ] 如果选 B：接入埋点模块（建议先写 `src/lib/analytics.ts`，localStorage 环形缓冲，后续替换上报端点）。
- [ ] 如果选 A：列出所有平台依赖文件，做一个最小 Taro 页面验证时间轴、Sheet、深色专注屏能否还原。

## 关键实现提示

- 状态入口：`src/store/AppProvider.tsx`，屏幕只通过 `useApp()` 读写，不要在屏幕里另造全局状态。
- 容量：`capacityStatus` / `trimCandidates` / `buildSmartSchedule`。
- 复盘：`computeDayRecord`；建议：`suggestTomorrowCapacity`。
- 持久化 key：`daymark.state.v1`。
- 首次种子：`src/data/seed.ts`；若要真实空态，不要直接删种子，先在 provider 增加 `mode: demo | real`。
- 专注恢复：`state.focus` 存 `startedAt` / `accumulatedSec` / `paused`，刷新后用 `focusElapsedSeconds` 继续。
- 明日容量：`tomorrowCapacityMin` 在下一天创建新计划时生效。
- 设置重置：`resetDemo()` 会恢复种子数据，但不会清理 `PlanFlow` 的模块级记忆。

## 已知坑

- 早间打开复盘会显示 5% 当前进度；这是「进行中」语义，不要误判为 bug。
- 种子计划把复盘仪式计入容量，智能排程生成的新计划不计入；统一前不要写依赖精确总和的测试。
- 规划页「换时间」只在本地草稿上移动，不会扩展留白；提交前不会写回 store。
- 删除任务是跨计划删除；后续做历史记录时要注意。
- 桌面端是 430px 居中壳，不是响应式宽屏后台；不要按桌面后台思路改布局。
- 目前没有后端、登录、云同步；所有「保存」都指 localStorage。

## 开放问题

1. 日刻这个名字是否最终保留？
2. 最终平台是微信小程序，还是 H5/PWA 也可以？
3. 如果做小程序，选 Taro 还是原生？是否需要复用现有 React UI？
4. 登录与云同步用微信云开发，还是自建后端？
5. 免费/订阅边界如何划分？智能排程、周报、云同步是否付费？
6. 是否保留演示种子数据作为「示例一天」，还是正式用户必须从空态开始？
7. 是否需要数据导出与账号删除在首个版本就上线？

## 完成定义（下一里程碑）

- 选定平台路线并写入 STATUS。
- 新用户可从空态完成一次「规划 → 专注 → 复盘」闭环。
- 关键行为有埋点，数据可导出。
- 主流程 E2E 继续通过。
- 如果做小程序：至少在微信开发者工具或真机完成一次主流程验收，并记录平台限制。
