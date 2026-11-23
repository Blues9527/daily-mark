# STATUS · 日刻 Daymark

最后更新：2026-11-23

- 仓库：`https://github.com/Blues9527/daily-mark`
- PRD 与可交互原型：`docs/daymark-prd.html`
- 当前形态：H5 MVP + 原生微信小程序版
- 微信小程序路径：`miniprogram/`（已实现，待在微信开发者工具 / 真机做视觉验收）
- 目标形态：微信小程序（代码已落地，账号、云同步与发布配置未接）
- H5 本地地址：`http://127.0.0.1:4173/?demo=1`（demo 固定为当天 10:12；去掉 `demo=1` 使用真实时间）

## 一句话

面向自由职业者与创作者的日内规划器：先算容量，再排时间块，执行时只面对当前块，晚上用 60 秒对账。

## 本轮已完成

### 1. 工程与设计底座

- React 19 + TypeScript + Vite 8 + Vitest 5，pnpm 管理依赖。
- 纸感米白 / 墨色 / 陶土橙视觉系统，宋体标题 + 系统无衬线正文。
- 共享组件：`Icon`、`TabBar`、`Toast`、`Sheet`。
- 桌面 430px 应用外壳，移动端全屏；处理安全区与滚动。
- 基础可访问性：按钮语义、`aria-label`、`aria-pressed`、焦点样式、减少动效适配。

### 2. 产品核心闭环

- 今日：
  - 容量卡（已排 / 容量 / 超出 / 留白），超载提示与「移出 N 项」。
  - 今日三件事、完成勾选、当前任务「进行中」。
  - 当前块 / 下一块 / 专注中继续入口。
  - 纵向时间轴、整点刻度、当前块高亮、现在线、可选块、休息 / 留白 / 仪式块。
  - 空计划状态与收集箱入口。
- 收集箱：
  - 类别筛选、未完成优先、已完成置底。
  - 新增 / 编辑 / 删除任务，标题、预估时长、类别、精力。
  - 勾选完成、开始今日规划。
- 晨间三步规划：
  - Step 1 清空大脑，候选任务来自未完成 MIT、今日已排任务与收集箱。
  - Step 1 支持输入新增、快捷 chip、去重。
  - Step 2 最多选 3 件，选择顺序即优先级，第 4 件拦截。
  - Step 3 根据精力与容量生成排程，包含午餐、留白、复盘；支持重新排一版、单块换时间、未排入提示。
  - 完成后写回今日计划、MIT 与任务状态。
- 专注模式：
  - 深色全屏、SVG 环形倒计时、暂停 / 继续、已专注分钟。
  - 走神捕手：想法 / 待办 / 情绪，不打断计时，可转为任务。
  - 完成本段 / 部分完成（15/30/45/60 分钟或自定义）。
  - 退出不结束 session，刷新后可从今日继续。
- 今日复盘：
  - 当前进度 / 已复盘状态，计划 vs 实际分类对比。
  - 偏航原因最多 2 个，明日容量建议，备注。
  - 保存后写入历史与连续记录，跳到统计。
- 统计：
  - 连续记录、最近 7 天专注柱状图、计划兑现、创作占比、最常超时类别。
  - 最近 14 天点阵、轻量徽章。
- 设置：
  - 昵称、每日容量、留白比例、开始 / 结束时间、默认预估。
  - 重置演示数据（二次确认）。
- 数据：
  - 全量状态持久化到 localStorage：`daymark.state.v1`。
  - 首次打开使用演示种子数据（阿川、12 天连续记录、今日超载计划）。
  - 明日容量建议会在下一天创建新计划时生效。

### 3. 领域逻辑

- `src/lib/capacity.ts`：计入容量规则、容量状态、可裁剪块选择。
- `src/lib/schedule.ts`：按精力排序、智能排程、午饭避开、留白与复盘、找空位、当前 / 下一块、顺延。
- `src/lib/review.ts`：今日对账、分类分钟、完成数、兑现率、明日容量建议。
- `src/lib/stats.ts`：最近 7 天、14 天日历、兑现均值、最常超时、周对比。
- `src/lib/focus.ts`：专注累计、剩余时间、进度、时钟格式化。
- `src/lib/date.ts`、`format.ts`、`storage.ts`、`id.ts`。
- `src/store/AppProvider.tsx`：全局状态、派生数据、全部业务动作、持久化、demo 时钟、toast。

### 4. 微信小程序版（本轮新增）

- 位置：`miniprogram/`，原生 WXML / WXSS / JS，CommonJS，无运行时 npm 依赖。
- 7 个页面：今日、收集箱、三步规划、专注、复盘、统计、设置。
- 原生 tabBar：今日 / 收集 / 复盘 / 统计，PNG 图标由 `tools/generate_icons.py` 生成。
- 自定义导航：`statusBarHeight` 实际取胶囊底部 + 8px，给原生胶囊留出安全区。
- 今日：容量与裁剪、三件事、当前 / 下一块、纵向时间轴、现在线、专注继续入口。
- 收集：类别筛选、增删改、勾选、底部编辑 Sheet；Sheet 打开时隐藏原生 tabBar，关闭恢复。
- 规划：三步流程、候选去重、最多三件、智能排程、单块换时间、固定提交栏。
- 专注：深色全屏、legacy canvas 环形进度、时间文字直接绘制在 canvas 上、暂停 / 继续、部分完成 Sheet、走神捕手。
- 复盘：进行中状态、当前兑现、分类对比、归因、明日容量、备注、保存。
- 统计：7 天柱状图、兑现 / 创作占比 / 最常超时、14 天点阵、徽章。
- 设置：昵称、容量、留白、时间、默认预估、重置确认。
- 数据：`wx.setStorageSync('daymark.state.v1')`，与 H5 同一套种子与业务逻辑；`?demo=1` 启动参数可固定 10:12。
- 工程：`project.config.json` 使用 `touristappid`，打开 `miniprogram/` 目录即可；`packOptions` 排除 tools/tests/package.json。
- 未进行微信开发者工具 / 真机视觉验收；按规则没有擅自启动模拟器。

### 5. 自动化验证

- H5 TypeScript：`pnpm exec tsc --noEmit` 通过。
- H5 单元测试：`pnpm test`，12/12 通过。
- H5 端到端：`python3 e2e/test_app.py`，7/7 通过。
  - 今日容量与裁剪
  - 收集箱增删改查
  - 三步规划与提交
  - 专注计时 / 暂停 / 走神 / 部分完成 / 复盘保存
  - 设置保存与重置、刷新持久化
  - 专注会话刷新恢复
  - 390 / 320 / 1440 宽度无横向溢出
- H5 生产构建：`pnpm run build` 通过。
  - 65 modules
  - JS 约 308 KB，gzip 约 94 KB
  - CSS 约 51.5 KB，gzip 约 10 KB
- 小程序领域测试：`node --test miniprogram/tests/*.test.js`，27/27 通过。
- 小程序页面运行时检查：`node miniprogram/tools/runtime_check.js`，7 个页面加载与主要交互通过。
- 小程序静态检查：`python3 miniprogram/tools/check_project.py`，页面 / 图标 / JS / JSON / WXML / WXSS / handler 检查通过。

## 当前运行方式

```bash
git clone https://github.com/Blues9527/daily-mark.git
cd daily-mark
pnpm install
pnpm dev
```

打开 `http://127.0.0.1:4173/?demo=1`。

其他命令：

```bash
pnpm exec tsc --noEmit
pnpm test
python3 e2e/test_app.py
pnpm run build
pnpm preview --port 4174
```

E2E 依赖本机 Chrome（Playwright `channel="chrome"`）和已启动的 4173 dev server。

### 微信小程序

用微信开发者工具打开 `miniprogram/` 目录（不是仓库根目录）：

- `project.config.json` 已指向当前目录，appid 为 `touristappid`。
- 正式预览 / 真机前，把 `appid` 换成自己的小程序 AppID。
- 无需为小程序执行 `pnpm install`；`miniprogram/package.json` 仅用于 Node CommonJS 测试。
- 静态检查：`python3 miniprogram/tools/check_project.py`
- 领域与 store 测试：`node --test miniprogram/tests/*.test.js`
- 页面运行时桩：`node miniprogram/tools/runtime_check.js`

## 明确未完成

- 微信小程序在开发者工具 / 真机的视觉验收与细节适配。
- 微信登录、手机号绑定、多端同步、云端数据库。
- 微信订阅消息、系统通知、锁屏 / 小组件入口。
- 日历导入与双向同步。
- 数据导出、账号删除、隐私协议与合规流程。
- 埋点事件落地（PRD 中的事件表尚未写入代码）。
- 重复任务 / 模板日 / 周计划 / 周报。
- AI 排程；当前只是确定性的精力排序 + 首次适配启发式。
- 真实用户引导与新用户空态；当前首次进入即演示数据。
- iOS Safari / 微信内置浏览器实测；目前只在 Chrome headless 验证。
- 单元测试未覆盖 React 组件与 store reducer；E2E 覆盖主流程。
- Git 仓库已初始化；小程序版本已加入本地 main，尚未推送；CI 未配置。
- 错误边界、全局错误上报、性能监控未做。
- 小程序未接入数据导出、埋点上报、订阅消息、日历导入。
- 小程序未做 AppID 替换、体验版上传、隐私协议与审核资料。

## 已知问题与技术债

1. **双端维护**：H5 与原生小程序是两套 UI，业务逻辑分别位于 `src/lib` 与 `miniprogram/utils`；改动容量 / 排程 / 复盘规则时需要同步两端。
2. **小程序未做视觉验收**：没有启动微信开发者工具 / 模拟器，也没有真机走查；胶囊安全区、canvas、WXSS 渐变、Sheet 与键盘行为需要在开发者工具和真机确认。
3. **胶囊安全区**：小程序页面把 `statusBarHeight` 实际设为「胶囊底部 + 8px」，用于避开原生胶囊；如果不同机型胶囊位置变化，需要再校准。
4. **专注 canvas**：使用 legacy canvas 绘制环，并把倒计时文字直接绘制在 canvas 上，避免原生组件层级遮挡；真机上需检查清晰度与 `setTextBaseline` 兼容性。
5. **演示数据**：首次进入即种子数据，没有 onboarding；正式上线需要区分 demo 与真实用户。
6. **复盘时段**：上午打开复盘会显示「当前进度」而不是最终成绩；这是刻意处理，但文案与入口还可以再优化。
7. **容量口径**：种子计划把复盘仪式计入已排容量；新生成的计划不计入。各自内部一致，但两种口径并存，后续应统一。
8. **数据存储**：H5 用 localStorage，小程序用 `wx.setStorageSync`；都只保存在本机，没有 schema 迁移策略。
9. **算法**：智能排程是可预测的启发式，不会根据历史完成率自动调整；「重新排一版」主要是任务轮换。
10. **设计覆盖**：H5 已验证 320/390/1440；小程序尚未在真实设备上验证小屏、长标题、深色系统主题与键盘弹出。
11. **运行环境**：H5 dev server 是本次会话启动的后台进程，后续会话可能需要重新 `pnpm dev`；小程序用微信开发者工具打开。

## 关键文件

- 状态与动作：`src/store/AppProvider.tsx`
- 类型：`src/types.ts`
- 核心算法：`src/lib/`
- 种子数据：`src/data/seed.ts`
- 屏幕：`src/features/{today,collect,plan,focus,review,stats,settings}/`
- 设计系统：`src/styles/tokens.css`、`src/styles/app.css`
- 共享组件：`src/components/`
- 单元测试：`src/lib/core.test.ts`
- E2E：`e2e/test_app.py`
- 小程序：`miniprogram/`
- 小程序逻辑：`miniprogram/utils/`
- 小程序 store：`miniprogram/utils/store.js`
- 小程序页面：`miniprogram/pages/`
- 小程序静态检查：`miniprogram/tools/check_project.py`
- 小程序运行时桩：`miniprogram/tools/runtime_check.js`
- 小程序测试：`miniprogram/tests/`

## 下一步

见同目录 `handoff.md`。
