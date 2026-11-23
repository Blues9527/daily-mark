# HANDOFF · 日刻 Daymark

最后更新：2026-11-23

下次会话请先读 `STATUS.md` 和本文件，再继续。不要重新实现已经完成的 H5 或小程序页面。

## 当前坐标

- H5 MVP 已完成：今日、收集箱、三步规划、专注、复盘、统计、设置。
- 原生微信小程序版已完成：`miniprogram/`，7 个页面与主流程已接通。
- 代码在 `https://github.com/Blues9527/daily-mark`。
- PRD 在 `docs/daymark-prd.html`。
- H5 地址：`http://127.0.0.1:4173/?demo=1`（demo 固定 10:12；去掉参数用真实时间）。
- 小程序打开方式：用微信开发者工具打开 `miniprogram/` 目录，不是仓库根目录。
- 小程序 AppID 仍是 `touristappid`，正式预览前需要替换。
- 首次进入是演示种子数据；设置里有「重置演示数据」。
- H5 验证：`tsc`、12 个单测、7 组 Playwright E2E、生产构建通过。
- 小程序验证：27 个 Node 测试、项目静态检查、7 页运行时桩与主要页面交互检查通过。
- 小程序尚未做微信开发者工具 / 真机视觉验收；没有擅自启动模拟器。
- 小程序版本已加入本地 `main`，尚未推送；H5 基线也在 `main`。

## 下次会话的第一件事

1. 进入仓库并安装 H5 依赖：

```bash
git clone https://github.com/Blues9527/daily-mark.git
cd daily-mark
pnpm install
pnpm dev
```

2. 先跑 H5 基线，确认没有回归：

```bash
pnpm exec tsc --noEmit
pnpm test
python3 e2e/test_app.py
pnpm run build
```

3. 再跑小程序静态与逻辑检查：

```bash
python3 miniprogram/tools/check_project.py
node --test miniprogram/tests/*.test.js
node miniprogram/tools/runtime_check.js
```

4. 视觉验收前先征得用户允许，再启动微信开发者工具或模拟器。打开 `miniprogram/` 目录，重点走查下面的清单。

## 小程序视觉验收清单

- 顶部安全区：状态栏、原生胶囊、自定义内容是否互相遮挡；不同机型是否正常。
- 原生 tabBar：今日 / 收集 / 复盘 / 统计的图标、选中色、页面切换。
- 今日：容量卡、进度条、三件事、当前块、时间轴绝对定位、现在线。
- 收集：筛选、勾选、新增 / 编辑 Sheet、键盘、隐藏 / 恢复 tabBar。
- 规划：三步切换、候选 14 件、最多三件、排程、固定 CTA 不被内容遮挡。
- 专注：深色全屏、canvas 圆环与时间文字、暂停、部分完成 Sheet、走神捕手。
- 复盘：进行中提示、深色分数卡、分类对比、原因 chips、建议、保存。
- 统计：7 天柱状图、3 个指标、14 天点阵、徽章。
- 设置：slider、时间 picker、固定底部保存、重置确认。
- 数据：切页 / 杀进程 / 重新打开后，任务、计划、专注 session 是否正确恢复。

## 路线决策（需要用户确认）

### A. 小程序验收与发布（推荐下一步）

- 在微信开发者工具中做第一轮视觉走查，修复胶囊、键盘、canvas、WXSS 细节。
- 替换 `touristappid`，配置真实 AppID 与项目成员。
- 真机走一遍「规划 → 专注 → 复盘」。
- 补隐私协议、用户协议、数据说明、体验版上传与审核资料。
- 按 AGENTS 规则：启动模拟器前先获得用户允许；测试环境不要打 release 包。

### B. 小程序后端与账号

- 微信登录、手机号绑定、云数据库（微信云开发或自建）。
- 多端同步、冲突解决、schema 迁移。
- 订阅消息：规划提醒、时间块开始、晚间复盘。
- 数据导出、账号删除、隐私合规。
- 建议先做本地 `mode: demo | real` 与 onboarding，再接入云端。

### C. H5 继续打磨

- onboarding、新用户空态、真实数据模式。
- 埋点事件按 PRD 落地。
- 数据导出、账号删除、iOS Safari / 微信内置浏览器走查。
- 与小程序同步容量 / 排程 / 复盘规则，避免两端行为漂移。

## 立即可执行的 5 个任务

- [ ] 运行 H5 与小程序全部检查，确认基线。
- [ ] 获得允许后，用微信开发者工具打开 `miniprogram/` 做视觉走查。
- [ ] 优先修胶囊安全区、canvas 清晰度、键盘遮挡、tabBar 与 Sheet 层级。
- [ ] 替换 AppID，真机主流程验收。
- [ ] 验收通过后推送小程序版本，并更新 STATUS。

## 关键实现提示

- H5 状态：`src/store/AppProvider.tsx`；页面只通过 `useApp()` 读写。
- 小程序 store：`miniprogram/utils/store.js`；页面通过 `require('../../utils/store')` 调用。
- 小程序领域逻辑：`miniprogram/utils/{capacity,schedule,review,stats,focus,date,format,seed}.js`。
- 小程序页面：`miniprogram/pages/{today,collect,plan,focus,review,stats,settings}/`。
- 小程序共享样式：`miniprogram/app.wxss`；页面样式在各页 `*.wxss`。
- 小程序图标：`miniprogram/assets/icons/`，由 `miniprogram/tools/generate_icons.py` 生成。
- 持久化 key：H5 `daymark.state.v1`；小程序 `wx.setStorageSync('daymark.state.v1')`。
- 小程序顶部 spacer 的 `statusBarHeight` 已被设置为「胶囊底部 + 8px」，用于避开原生胶囊；不要按普通状态栏高度理解。
- 专注圆环使用 legacy canvas，并把倒计时文字直接绘制在 canvas 上，避免原生组件层级遮挡。
- 收集 Sheet 会调用 `wx.hideTabBar`，关闭时恢复；改 Sheet 交互时保留这个行为。
- H5 端到端脚本：`e2e/test_app.py`；小程序静态检查：`miniprogram/tools/check_project.py`；运行时桩：`miniprogram/tools/runtime_check.js`。

## 已知坑

- 小程序没有在开发者工具 / 真机里看过，任何“视觉上应该没问题”的判断都要以实际截图为准。
- 原生胶囊与自定义导航容易重叠；当前用较大的顶部 spacer 规避，可能需要在真机上调小。
- canvas 是原生组件，已把时间绘制进 canvas；不要再把普通 `view` 叠在 canvas 上作为唯一时间显示。
- 小程序 tab 页上的 Sheet 无法覆盖原生 tabBar，当前用隐藏 tabBar 处理；新增加 Sheet 时注意。
- 小程序页面禁止使用 `window`、`localStorage`、`document`、ES import/export；领域逻辑用 CommonJS。
- WXSS 已避开 grid、gap、backdrop-filter、conic-gradient、`:hover`；新增样式时继续保持。
- 规划页固定 CTA 与设置页固定 footer 依赖页面底部 padding；改布局时一起检查。
- 早间复盘显示「当前进度」不是最终成绩；这是进行中语义。
- 种子计划把复盘仪式计入容量，新生成的计划不计入；统一前不要写依赖精确总和的测试。
- H5 与小程序是两套 UI，业务规则同步修改，避免两端结果不同。
- 目前没有后端、登录、云同步；两端「保存」都只写本机。

## 开放问题

1. 小程序 AppID 是否已经准备好？是否用微信云开发？
2. 是否先做真机视觉验收，再决定是否继续加账号 / 云同步？
3. 订阅消息要哪几类：规划、块开始、复盘，还是全部？
4. 数据导出与账号删除是否作为首个版本的上线门槛？
5. 日刻这个名字是否最终保留？
6. 免费 / 订阅边界如何划分？
7. H5 与小程序是否长期双端维护，还是小程序验收后以小程序为主？

## 完成定义（下一里程碑）

- 小程序在微信开发者工具和至少一台真机上完成一次主流程：规划 → 专注 → 复盘。
- 胶囊、tabBar、Sheet、canvas、键盘、固定 footer 无阻塞问题。
- 静态检查、27 个领域 / store 测试、运行时桩继续通过。
- 替换 AppID，记录真机与基础库版本。
- 更新 STATUS 后再提交小程序版本。
