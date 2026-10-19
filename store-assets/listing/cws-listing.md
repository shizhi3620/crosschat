# Chrome Web Store 上架文案包 · CrossChat v1.0.1

> 用途：CWS 提交/更新时逐字段复制。默认 listing = English；**Chinese (Simplified) 本地化 listing 必须在开发者后台补全并随本次更新一起提交**（评审 P0-1：中文卖家是核心受众；CWS 按浏览器/商店语言自动展示对应语种，匹配不到时回退英文）。
> 约束（plan rev.2 §8）：全文不出现任何电商平台名称/商标，不出现「自动回复 / auto-reply」措辞；只描述单一用途（草拟回复）。
> v1.0.1 事实变化（文案必须同步，勿沿用 v1.0.0 旧稿）：① 匿名统计通道完全停用，包内无统计密钥、无 GA 主机权限；② 等候名单邮箱收集已移除；③ 演示/失败占位文案不可采纳进发送框；④「测试连接」不保存即测并给中文错误归因；⑤ 新增越南/巴西/泰国/印尼手机号识别与 ZaloPay/MoMo/GoPay/DANA/Pix/PromptPay 本地钱包合规词；⑥ WAR 对外暴露已删除；⑦ 支持 Edge 110+（同一 MV3 架构）。

---

## A. 商店元数据（两种 listing 通用）

| 字段 | 值 |
|---|---|
| Category（类别） | **Productivity** |
| 语言 | 商店 listing：English（默认）+ Chinese (Simplified)；扩展 UI 以中文为主、模型输出按买家语言 |
| 定价 | Free（无应用内购买、无广告、无订阅入口；验证期 0–90 天完全免费） |
| 分发 | Public（公开，全球区域；BYOK 需要用户自备火山方舟账号，离线演示全球可用） |
| 版本更新说明 / What's new（v1.0.1 更新包，EN） | `v1.0.1: analytics channel fully disabled and the packaged write secret removed; demo/failure placeholder drafts can no longer be adopted into the reply box; Test Connection now probes without saving and explains 401/403/404/timeout errors; waitlist email collection removed; added Vietnam/Brazil/Thailand/Indonesia phone-number detection and local wallet (ZaloPay, MoMo, GoPay, DANA, Pix, PromptPay) compliance checks; permissions narrowed.` |
| 版本更新说明（Chinese (Simplified) listing 对应栏） | `v1.0.1：完全停用匿名统计通道并移除包内统计密钥；演示/失败占位文案不可再采纳进发送框；「测试连接」改为不保存即测，并给出 401/403/404/超时中文原因；移除等候名单邮箱收集；新增越南/巴西/泰国/印尼手机号识别与 ZaloPay、MoMo、GoPay、DANA、Pix、PromptPay 本地钱包合规检查；收敛扩展权限。` |
| 内容分级 | Everyone；不含用户生成内容社交/暴力/付费博彩等任何触发项 |
| 隐私政策 URL | `https://shizhi3620.github.io/crosschat/privacy.html` |
| 官网 | `https://shizhi3620.github.io/crosschat/` |
| 支持页 / 联系 | `https://shizhi3620.github.io/crosschat/support.html`；联系邮箱 `crosschat.app@gmail.com` |
| 单张用途（Single purpose） | 见 D 节，逐字粘贴 |
| 权限说明（Permission justifications） | 见 E 节，逐字段粘贴 |
| 素材 | icon 128×128、marquee promo 1400×560、截图 4 张（见 G 节） |

---

## B. English listing（默认）

### Item name（≤75 字符，当前 48）
```
CrossChat — AI Customer Reply Drafting Assistant
```

### Summary（≤132 字符，当前 116；与包内 `_locales/en` manifest description 逐字一致）
```
Multilingual AI reply drafts for seller chats: translation, KB citations, PII masking. Drafts only — you click send.
```

> ⚠️ **CWS 提交陷阱（2026-10-17 首包实测）**：上传 ZIP 后，商店会用包内 manifest 的英文 description **自动预填** Summary 字段。首包该串为 145 字符，提交时被拒（`The description translation in locale en is too long: 145. It exceeds maximum size limit of 132 characters.`）。已把 manifest description 改为上面这串（116）并重打包；重传新包后仍须肉眼复核 Summary = 本串。若不想重传包，也可直接在表单里把该字段手动改成上面这串再提交。

### Full description
```
CrossChat helps cross-border e-commerce sellers answer buyer messages in any language. It never sends a message for you.

You capture the buyer's message in the seller backend you already use. CrossChat classifies it, translates when needed, and drafts a reply grounded in your own knowledge base (shipping times, return policy, sizing, payment and more). You review, edit if you like, and click the platform's own send button yourself.

How replies are drafted
- Smart triage keeps cost and latency low: routine FAQ questions are served from an instant local cache, everyday questions use a fast model, and a stronger model is reserved for genuinely difficult cases such as disputes or strongly negative messages.
- Knowledge-base citations: drafts reference the exact KB entry used, so you can verify before sending.
- Translation and bilingual drafting for cross-border buyer conversations.
- Works in your existing seller center, CRM or webmail: the assistant is injected only on the sites you explicitly authorize, and any custom domain can be added.

Safety by design
- Drafts only. CrossChat never clicks send, never schedules messages, and never performs actions in buyer conversations. Every reply goes out manually, by you.
- Demo and failure outputs are placeholders: they are shown with a red "do not send" warning and cannot be adopted into the reply box, so a demo string or an error message can never be sent to a buyer by mistake.
- Personal data (email addresses, phone numbers — including Vietnam, Brazil, Thailand and Indonesia formats — card numbers, postal addresses) is detected and masked before any model request, and restored automatically when you adopt a draft.
- Compliance guardrails flag risky drafts — off-platform payment requests including local wallets and rails (ZaloPay, MoMo, GoPay, DANA, Pix, PromptPay and more), exchanged contact details, review incentives, policy-violating promises — and prevent unsafe content from being filled into the reply box.

Privacy first
- No account and no sign-up. Conversations and settings stay on your device and are removed when you uninstall the extension.
- BYOK: optionally bring your own Volcengine Ark (Doubao) API key. The key is stored only in local browser storage, and model requests go directly from your browser to the provider — they do not pass through any server of ours. "Test Connection" probes using what you typed without saving, and reports 401/403/404/timeout failures in plain language; a failed test never overwrites your saved settings.
- No key? A built-in offline demo (four sample scenarios, including a dispute case) runs the complete pipeline without any network access.
- Since v1.0.1 the anonymous statistics channel is fully disabled: the extension sends no analytics requests, ships with no analytics secret, and requests no analytics host permission.

Cost
- Free during the launch validation period, with no feature limits.
- With BYOK, you pay the model provider directly according to your own usage.
- A small optional hosted trial quota may later be offered; v1.0.1 collects no email addresses and keeps no waitlist.

Requirements: Google Chrome or Microsoft Edge, version 110 or newer. Offline (developer-mode) install instructions and an illustrated BYOK setup are on the linked support site. Support and privacy details are linked on this listing.
```

---

## C. Chinese (Simplified) listing

### 商品名称（≤75 字符，当前 27）
```
跨海聊 CrossChat — AI 客服回复草拟助手
```

### 一句话简介（≤132 字符，当前 52）
```
跨境客服 AI 草拟多语种回复：翻译、知识库引用、PII 脱敏与合规护栏。只草拟，每条回复由你亲自发送。
```

### 详细描述
```
跨海聊帮助跨境电商卖家用任何语言回复买家消息——但绝不会替你发送任何一条消息。

在你已经在使用的卖家后台里捕获买家消息，跨海聊会自动分级、按需翻译，并基于你自己的知识库（物流时效、退换货政策、尺码、支付方式等）草拟回复。你审核、随意修改，然后亲自点击平台自己的发送按钮。

回复是怎么草拟出来的
- 智能分级，兼顾成本与速度：常规 FAQ 走即时本地缓存，日常问题走快速模型，只有纠纷、强烈负面情绪等真正困难的场景才调用更强的模型。
- 知识库引用：草稿会标注引用了哪一条 KB，发送前可逐条核对。
- 翻译与双语草拟，覆盖跨境买家会话。
- 运行在你现有的卖家中心、CRM 或网页邮箱中：助手只在你明确授权的站点上注入，也可以添加任意自定义域名。

安全是设计出来的
- 只草拟，不代发。跨海聊不会点击发送、不会定时发消息、不会对买家会话执行任何操作。每条回复都由你本人手动发出。
- 演示与报错输出都是占位内容：红底提示「切勿外发」且无法采纳进发送框，演示文案或报错信息不可能被误发给买家。
- 个人信息（邮箱、电话——含越南、巴西、泰国、印尼本地号码格式——银行卡号、地址）在发送给模型之前先识别并脱敏，你采纳草稿时自动还原。
- 合规护栏会标记高风险草稿——站外支付（含 ZaloPay、MoMo、GoPay、DANA、巴西 Pix、泰国 PromptPay 等本地钱包/转账渠道）、交换联系方式、索要/利诱好评、违反平台政策的承诺——并阻止不安全内容被填入回复框。

隐私优先
- 无需账号、无需注册。会话与配置只存在你的设备本地，卸载扩展即清除。
- BYOK：可填入你自己的火山方舟（豆包）API Key。Key 只保存在浏览器本地存储，模型请求从你的浏览器直发服务商，不经过我们的任何服务器。「测试连接」直接使用表单当前值探测、不保存配置，并对 401/403/404/超时给出通俗中文原因；测试失败绝不会覆盖你已保存的设置。
- 暂时没有 Key？内置离线演示（四个示例场景，含一个纠纷场景）无需联网即可跑通完整流程。
- v1.0.1 起匿名统计通道完全停用：扩展不发送任何统计请求，安装包内不含统计密钥、不申请统计相关主机权限。

费用
- 上线验证期内完全免费，无功能限制。
- 使用 BYOK 时，模型调用费用由你直接与火山引擎按实际用量结算。
- 未来可能开放少量托管体验额度；v1.0.1 不收集任何邮箱、不设等候名单。

环境要求：Google Chrome 或 Microsoft Edge 110 及以上版本。访问不了商店时的离线（开发者模式）安装方法、BYOK 图文配置教程都在本页链接的支持站点上。
```

---

## D. Single purpose（CWS 隐私实践表，英文，≤200 词）

```
CrossChat has one single purpose: help a cross-border seller draft replies to incoming buyer messages inside the seller's own customer-service web pages.

With the seller's explicit action, the extension captures the selected buyer message, optionally translates it, processes it through either a built-in offline demo engine or the seller's own model provider under bring-your-own-key (BYOK), and displays a draft reply together with knowledge-base citations, personal-information masking results and compliance findings. On the seller's explicit click it fills the draft into the page's existing reply box for human review. The seller then clicks the platform's own send button; the extension never sends.

Secondary capabilities all serve this purpose: a local usage/cost dashboard computed from the seller's own activity, per-site on/off controls, an onboarding page with an offline demo, and a code-level whitelist definition for anonymous usage counters (the statistics transport is fully disabled in v1.0.1 and sends no requests).

The extension does not send messages, schedule messages, click platform buttons, collect message content on a server, build advertising profiles, or take any autonomous action in a user's accounts. Site access is granted per domain by the user and can be revoked at any time.
```

---

## E. 权限与数据实践（Privacy practices 表单逐字段）

### E1. 权限用途说明（permission justification）

| 申请项 | 粘贴说明（英文） |
|---|---|
| `storage` | `Stores the user's settings, optional BYOK API key, knowledge base, conversation history and local usage metrics. All data remains in chrome.storage local areas; since v1.0.1 the extension makes no analytics requests, so nothing is uploaded except the direct, user-initiated model request described below.` |
| `scripting` | `Dynamically registers and unregisters the assistant content script only on domains the user has explicitly added and granted at runtime (via optional_host_permissions). The registered script is a prebuilt classic-script bundle packaged inside the extension; no content script is injected before the user authorizes a site, and removing a site unregisters it immediately. The extension declares no web_accessible_resources.` |
| host `https://ark.cn-beijing.volces.com/*` | `The extension's ONLY static host permission. Required only when the user configures BYOK with their own Volcengine Ark (Doubao) API key: model requests are sent directly from the browser to this provider using the user's key. The built-in offline demo mode never contacts this host, and the extension never contacts any analytics host (the v1.0.0 Google Analytics transport and its host permission were removed in v1.0.1).` |
| optional hosts `https://*/*` / `http://*/*` | `Requested at runtime, one domain at a time, only after the user adds a seller site in settings (marketplace seller centers, webmail, or self-hosted/internal CRM systems, some of which are served over HTTP on intranets). The extension ships with no default broad site access; grants are listed and revocable on the options page.` |

### E2. 数据收集证明（certification 勾选项）

- **不销售数据**：勾选；**不用于单一用途之外的任何目的**：勾选；**不用于广告个性化**：勾选（扩展本身不展示任何广告）。
- **Collected data 行**：v1.0.1 起开发者侧收集 = **无**，所有类目均可不勾选：
  - Web history：**不勾选**（不采集 URL/浏览历史；平台大类只在本机用于看板，不外发）。
  - Personal communications / Website content：**不勾选**——买家消息正文仅在用户主动操作时从浏览器直发用户自选的模型服务商（BYOK，用户与服务商之间的关系），扩展开发者不接收、不存储；离线演示完全不联网。
  - Personal info：**不勾选**——v1.0.1 已移除等候名单邮箱表单，扩展不收集任何邮箱或身份信息。
  - 技术性遥测：**无**。v1.0.1 统计通道停用，不产生统计请求，安装包内无统计密钥；代码内仅保留事件白名单定义（`install` / `daily_active` / `draft_generated` / `draft_adopted`，枚举字段 level/platform_class/mode），未来恢复时只走自建匿名中继并默认关闭，届时重新提交数据实践声明。
- **Cookie 使用声明**：扩展自身不设置 Cookie，也不加载任何第三方脚本。
- **第三方服务商披露**（隐私页已同步写明）：
  1. **火山方舟 Volcengine Ark**——仅 BYOK 模式且用户主动触发草拟时，用户自有 Key、浏览器直发；
  2. 无其他第三方接收方（v1.0.0 的 GA4 接收关系已随 v1.0.1 终止；商店页与官网本身由 Google/GitHub 平台托管，按各平台政策覆盖）。
- **数据保留/删除**：全部数据仅存本机（chrome.storage.local），看板可清空、设置页可删 Key/站点、卸载即全部清除；开发者侧无服务端数据因而无保留期问题。
- 儿童：不面向 13 岁以下儿童，无定向收集。
- 合规法规：非金融/医疗类；无健康、精确位置、生物识别等敏感类别。

### E3. CWS 审核员可能提问的预案（C2d checklist 引用，不在表单里粘贴）

- 为何要 `http://*/*`：仅用于用户自行添加的内网/自建 CRM；权限为 optional，运行时逐域弹窗申请，默认零站点访问。
- v1.0.1 为何只有一个静态 host（Ark）：仅 BYOK 用户主动配置后才用，消息已在本机 PII 脱敏；v1.0.0 的 GA 统计 host 已随统计通道一并移除，审核员抓包不会看到任何分析域名请求。
- 是否自动化操作卖家账号：否。hard boundary——扩展没有调用任何平台发送/消息 API，唯一动作是把草稿写进页面 textarea，且需要用户两次主动点击（草拟、采纳填入），发送动作 100% 在平台原生控件上由人完成。v1.0.1 增加第三道保险：演示/失败占位内容在 UI 上禁止采纳。
- 为何 v1.0.1 删除了 web_accessible_resources：v1.0.0 曾为模块加载器暴露内部脚本；v1.0.1 改为打包期预编译的经典脚本 bundle，经动态 `chrome.scripting` 注册，未授权站点不注入，且不再向任何网页暴露扩展内资源。商店素材与文案不使用任何平台商标。

---

## F. 商店文案禁用词自查（plan rev.2 §8 + CWS 规则）

- [x] 无任何平台名称/商标（TikTok / Shopee / Amazon / Gmail 等），中英文均无
- [x] 无「自动回复 / auto-reply / automatically respond / bot sends」类措辞；统一为「draft / 草拟，you click send / 由你亲自发送」
- [x] 无关键词堆砌、无「最/best/#1」、无效果保证
- [x] 描述中不放外链（支持/隐私走商店专用字段）
- [x] 不承诺平台政策合规结果，只描述「flag/block risky drafts」
- [x] 免费表述真实：验证期全功能免费；BYOK 费用是用户与服务商之间的直付，已明示

---

## G. 素材清单（与本包一起归档）

| 用途 | 文件 | 规格 | 状态 |
|---|---|---|---|
| Store icon | 扩展根目录 `assets/icons/icon-128.png`（manifest `icons` 已声明 16/32/48/128） | 128×128 PNG | ✅ 沿用 |
| Marquee promo | `../promo-1400x560.png` | 1400×560 PNG（源 `promo-1400x560.svg`） | ✅ 沿用 |
| Screenshot 1 | `../screenshots/ss-1-inbox-assistant.png` | 1280×800，真实收件箱场景：L2 纠纷升级 + KB 引用 + PII 脱敏 + 人工发送 | ⚠️ v1.0.1 建议重拍：补入红底「占位内容不可采纳」状态（未配置 Key 时）或真实 BYOK 草稿状态 |
| Screenshot 2 | `../screenshots/ss-2-demo-l2-pii.png` | 1280×800，离线演示页跑纠纷+PII 全流程 | ⚠️ v1.0.1 建议重拍：占位警告条 + 禁用态采纳按钮是本轮核心卖点 |
| Screenshot 3 | `../screenshots/ss-3-dashboard.png` | 1280×800，本地用量/成本看板 | ⚠️ 必须重拍：配额标签已改为「按用量最高的单店展示，非全店合计」；另拍一张空数据引导黄条 |
| Screenshot 4 | `../screenshots/ss-4-onboarding.png` | 1280×800，三步引导 + 隐私三原则 | ⚠️ 必须重拍：等候名单卡片已替换为「托管额度筹备中，表单就绪前不收集邮箱」 |
| Screenshot 5（新增） | `../screenshots/ss-5-options-test-conn.png` | 1280×800，设置页 BYOK 区：「测试连接（不保存，即填即测）」+ 中文 401/403/404 归因 + 方舟三步引导 | ❌ 待拍摄（评审 P0-3 卖点） |
| GIF 演示（新增，评审 P0-1 要求） | `../screenshots/demo-flow.gif`（建议同时保留 .webm/.mp4 源） | 1280×800 或 1440×900 录屏导出，≤10s，≤5MB，循环无黑帧 | ❌ 待录制，分镜见下 |
| Small promo 440×280 | — | 可选，不提交（C2d 如需再补，从 SVG 裁切） | ⏸️ |
| Global promo 920×680 | — | 可选，暂不提交 | ⏸️ |

已有 4 张为 Chrome for Testing 155 加载真实扩展代码的实拍（非设计稿），演示数据标注「演示模式」，无平台商标、无真实 PII，详见 `../screenshots/README.md`。**v1.0.1 更新提交前，标注 ⚠️/❌ 的素材必须用 v1.0.1 真实代码重拍/新拍**——商店截图若继续展示 v1.0.0 旧界面（旧配额文案、等候名单框、旧测试按钮），会与描述自相矛盾。

### G1. GIF 分镜脚本（≤10 秒，中文界面为主，给录制同学的逐镜说明）

1. **0–2s**：打开内置离线演示收件箱，选中一条英文/越南语买家消息，点工具栏跨海聊图标 → 面板展开。
2. **2–4s**：点「翻译」→ 显示中文译文（演示水印）；再点「草拟」→ L1/L2 路由徽章与 KB 引用条出现。
3. **4–6s**：切到未配置 Key 的占位结果：红底警告条「演示模式占位内容…不可填入发送框」，采纳按钮为禁用态「占位内容不可采纳」，鼠标悬停显示 tooltip——表现"想误发也发不出去"。
4. **6–8s**：设置页 BYOK 区，点「测试连接（不保存，即填即测）」→ 展示一次成功（模型名 + token 数）或一次 401 中文归因弹窗。
5. **8–10s**：回到看板，L0/L1/L2 占比与「按用量最高的单店展示」标签入镜，收尾于「只草拟 · 你亲自点发送」徽章。
注意：全程不出现真实平台商标/真实买家 PII；录屏鼠标放慢，每步至少停留 0.6s；导出后自查 GIF 循环首尾不跳变。

---

## H. 与代码的对应关系（提交前核对）

- manifest `name`/`description` 已改为 `__MSG_app_name__` / `__MSG_app_description__`：安装后英文 UI 用户看到 B 节名称，中文 UI 用户看到 C 节名称。
- **英文 description（Summary 同源）**：首包 `_locales/en` 为 145 字符，被 CWS 以 132 上限拒绝；2026-10-17（commit `8e0991c`）起改为与 §B Summary **逐字一致的 116 字符串**。`zh_CN` description 86 字符，与 §C 简介同义（商店中文 Summary 仍按 §C 粘贴）。
- CWS 上传 ZIP 时会以包内 default locale 的 description 自动预填 Summary 字段——重传包后必须打开 Store listing 页复核该字段长度与内容。
- 安装后 chrome://extensions 显示名来源：`_locales/en/messages.json`（default_locale=en）与 `_locales/zh_CN/messages.json`。
- 截图中 contact@example.com 仅为占位；正式联系邮箱 `crosschat.app@gmail.com` 已写入 `src/config/telemetry.config.js` 的 `CONTACT_EMAIL`（公开联系邮箱，非密钥）；商店包内页面运行时即显示真值。
- **v1.0.1 提交清单（运营方手动）**：① 上传 v1.0.1 新包（manifest version=1.0.1，无 GA host、无 WAR、content.bundle.js 已预编译进包）；② 粘贴本文件 §A What's new 与 §B/§C 更新后的描述；③ 补全 Chinese (Simplified) listing 并上传重拍截图 + GIF；④ 数据实践表按 §E2 改为"开发者不收集"；⑤ 同步在 Partner Center 提交 Edge Add-ons（文案复用 §C 中文稿，Edge 侧隐私实践同样声明无遥测）；⑥ 提交前先在 GA4 后台吊销 v1.0.0 泄露的 Measurement Protocol api_secret（`G-Y1ZP2M0BX6`，见 BHB-20 评论的手动行动项）。
