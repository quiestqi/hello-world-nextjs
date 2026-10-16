# Design for Generative AI 项目工作文档

最后更新：2026-10-15（America/New_York）。维护原则：每次继续工作先核对仓库提交、数据库状态和部署版本；完成一项再更新其状态并附证据。本文不包含密钥或个人用户数据。

## 产品方向更新（2026-10-15）

用户将新产品方向改为单人文学/戏剧作品朝圣：先建整部作品的城市地点与到场人物数据集，再筛选角色，最后设计探索体验。首部为雨果原著《巴黎圣母院》，首位角色选定格兰古瓦。音乐剧旧档案不作原著事实依据。

新数据位于项目根目录 `nddp-dataset/novel/`：原文来源与章节索引、地点、场景、人物关系及卷章证据已建立首版；现代地理定位仍待核。本地 Next.js 已实现新地图、格兰古瓦视角、朝圣簿，以及巴黎路线生成与评分代码；生产构建及 14 项测试通过。原登录和 `/explore` 路线评分保留。云端迁移与 51/29/74 数据导入现已完成；真实 Google 登录与云端收藏已验证，数据库路线保存/评分/RLS 回滚测试通过。真实 Gemini 调用与部署尚未完成。具体入口与配置见 `STAGED_PARIS_SETUP.md`。下文旧实现状态为转型前基线。

## 1. 当前结论与项目目标

项目为 Coffee Club：先完成 Next.js 网页与 Vercel 部署，再展示 Supabase 咖啡数据，增加 Google 登录、个人资料和受保护页面，之后扩展成 AI 生成纽约咖啡散步路线的应用。目标用户希望用一杯咖啡和几个公共地点，轻松安排短途出行。路线可以保存、浏览和投票。

本次核查发现，实际代码已超过“刚讨论 Assignment #3”的阶段：Assignment #3 的核心代码已提交，Assignment #4 的路线生成、投票和地图代码也已存在。代码存在不代表线上服务配置已验证，更不代表课程已经提交或评分完成。

状态标签：**代码已核实**＝本次查看到实现；**本次验证通过**＝本次运行检查成功；**历史记录**＝已有文档或用户回顾描述；**待验证**＝本次未验证线上实际状态；**待做**＝明确尚未完成。

## 2. 工作入口与证据边界

| 项目 | 当前记录 |
|---|---|
| GitHub | https://github.com/quiestqi/hello-world-nextjs （本次连接器可读） |
| 分支 | GitHub 默认分支为 `main` |
| 核查基线 | `cfaf0914e3901ed4fa0af789985ee7d2bf94a544`，2026-10-08；本地 HEAD 与 GitHub 最近提交查询一致 |
| 活跃工作副本 | 当前项目下 `existing-app/`，有 Git 仓库，本次开始时工作区干净 |
| 旧工作副本 | `assignment-work/hello-world-nextjs/`，无独立 Git 仓库；保留为参考，继续开发使用 `existing-app/` |
| 旧压缩包 | `hello-world-nextjs-english.zip`；不能用它判断现网版本 |
| 历史生产入口 | https://hello-world-nextjs-peach.vercel.app ，来自 `ASSIGNMENT_SETUP.md`；本次网页工具无法读取，不能据此断言已下线或正常 |
| Supabase 项目 ref | 尚未从可访问配置中确认；不要猜测或新建替代项目 |
| Vercel 项目 ID / 最新 deployment URL | 本次未核实；生产别名不能代替某次部署的独立 URL |

已读取所引用聊天《项目工作文档》（`6ad11cfa-f6e4-83ea-b72b-3bd9fb49d815`）。接口仅返回一条“回顾上次进度并给工作文档”的用户消息，无更早实施记录或附件。因此早期进度来自用户本次回顾，实际实现以仓库为证。`sources/` 若有同步文件，一律只读。

## 3. 技术栈与文件导航

以本次 `package.json` 为准：Next.js `^16.3.8`（本次构建报告 16.3.8）、React / React DOM `19.2.8`、TypeScript `^5`、Tailwind CSS `^4`、ESLint `^9`、`@supabase/ssr ^0.12.7`、`@supabase/supabase-js ^2.117.2`、Leaflet `^1.9.4`。确切依赖解析见 `package-lock.json`。

使用 App Router、Server Components 和 Server Actions；Supabase 提供 Postgres、Auth 和 Storage；Vercel 为既有部署目标。Assignment #4 用服务器端 Gemini REST API 生成结构化路线。当前页面显示 Google Maps 区域嵌入及步行导航链接；仓库保留早期 Leaflet / AI 插画模块，但当前展示链路不等同于所有历史模块均启用。

| 文件 | 职责 |
|---|---|
| `app/page.tsx` | 登录与姓名检查后读取 `coffees` |
| `app/login/page.tsx` | Google OAuth 按钮、加载及错误提示 |
| `app/auth/callback/route.ts` | 用授权 code 换会话，根据姓名完整度跳转 |
| `app/auth/actions.ts` | 退出登录 |
| `app/members/page.tsx` | 受保护的欢迎页；不是公开用户目录 |
| `app/profile/page.tsx`, `actions.ts` | 姓名编辑、头像上传、私有图片签名地址 |
| `lib/supabase/client.ts`, `server.ts` | 浏览器和服务器 SSR 客户端 |
| `proxy.ts` | 刷新认证 cookies、设置 private/no-store；页面本身执行访问检查 |
| `app/explore/` | 生成、社区路线、投票、地图 UI |
| `supabase/migrations/` | 数据库变更的代码来源 |
| `ASSIGNMENT_SETUP.md`, `COFFEE_WALKS.md` | 历史配置和产品说明；其中历史验证声明不自动算本次验证 |

## 4. 已做内容与证据

| 阶段 | 已核实内容 | 证据与限制 |
|---|---|---|
| Assignment #1 | Next.js 项目代码；用户报告已部署 | 提交 `72e4375`；线上部署本次未复验 |
| Assignment #2 | Supabase 咖啡列表实现 | 提交 `4c6baa6`；当前首页读取 `coffees` 的 `id/name/origin/description`。用户报告已完成；本次未读取线上数据 |
| Assignment #3 | Google OAuth、callback、退出、Profile、头像、路由保护 | 提交 `b291885`、`f912186`、`63b6a03`、`b4894b0`；上述路由及 profiles 迁移实际存在；OAuth 控制台和迁移应用情况待验证 |
| Assignment #4 扩展 | Gemini 路线、保存 prompt、投票、生成配额、地点目录、区域地图 | 从 `8063c83` 至 `cfaf091` 的提交及实际代码；目录迁移目标为 25 个地点、3 个区域，线上行数未验证 |
| 本次检查 | ESLint、路线与地图设计测试 | lint 退出码 0；11/11 测试通过；不覆盖真实 OAuth、RLS 或外部模型可用性 |

Assignment #3 当前行为：未登录访问 `/`、`/members`、`/profile`、`/explore` 会由页面检查跳到 `/login`；已登录但缺 first/last name 时，业务页面跳到 `/profile`。Google callback 成功后，姓名完整去 `/`，否则去 `/profile`。姓名 trim 后不能为空、每项最多 80 字符，保存后回首页。头像可选，允许 JPG/PNG/WebP，最多 5 MiB；上传后存对象路径，展示时生成 1 小时签名 URL。不要将这些代码行为表述成已完成真实账户验收。

## 5. 环境变量与环境管理

模板是 `.env.example`；本地使用未跟踪的 `.env.local`，Vercel 在既有项目 Settings → Environment Variables 配置。分别核对 Development / Preview / Production 的作用域，修改后重新部署。本文只记录变量名与用途。

| 变量 | 用途 | 是否发到浏览器 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 同一个 Supabase 项目的 URL | 是 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 发布用 key，依靠 RLS 限权 | 是；不能替换为 service role / secret key |
| `GEMINI_API_KEY` | Assignment #4 模型调用 | 否，仅服务器 |
| `GEMINI_MODEL` | 可选，固定文本模型；未设置时代码默认 `gemini-flash-lite-latest`，并有兼容性回退 | 否 |
| `GEMINI_IMAGE_MODEL` | 遗留插画路径可选，默认见代码；模型与额度本次未在线核实 | 否 |
| `GEMINI_MAP_MODE` | 遗留插画路径的 vector/image 选择；当前路线页不主动生成插画 | 否 |

注意 `.env.example` 当前显式设置 `GEMINI_MODEL`，复制后保留该值会关闭“未设置模型时”的自动回退；需要回退时移除该可选配置。Google Client ID/Secret 配在 Supabase Google Provider 中，本应用不需要在浏览器环境变量里存 Client Secret。代码不要求 service-role key。不要把 access token、refresh token、OAuth code、cookie、私有签名 URL 放入提交、截图或日志。

## 6. 数据库 schema、RLS、trigger

以下是仓库迁移定义的目标状态，**不是本次查询线上数据库所得的结果**。

### Assignment #2 / #3

`public.coffees`：首页依赖 `id`、`name`、`origin`、`description`。仓库现有迁移没有重建原始 coffees 表的完整 DDL，字段类型、主键、种子数量须通过只读核查补齐，不能据 UI 猜测。

`public.profiles`：

```sql
id uuid primary key references auth.users(id) on delete cascade,
first_name text null,
last_name text null,
avatar_url text null
```

`avatar_url` 虽然叫 URL，实际存储 `用户UUID/随机UUID.扩展名` 的 Storage 对象路径。姓名在新用户创建时允许空值，随后由应用引导补全；迁移不自动复制 Google 元数据姓名，也没有数据库级 80 字符约束。

`202610080001_profiles.sql` 定义 `public.handle_new_user()`：`security definer`、空 `search_path`，向 `profiles(id)` 插入新用户 ID，冲突忽略；`auth.users` 上 `on_auth_user_created` 为 AFTER INSERT / FOR EACH ROW trigger。迁移还回填已有 auth 用户，保留既有姓名。触发器执行失败可能导致注册失败，应检查 Auth 日志和数据库错误，不要通过关闭 RLS 处理。

profiles 启用 RLS。基础迁移只允许 authenticated 读取和更新自己的行，`USING` 和 `WITH CHECK` 均限定 `auth.uid() = id`。第二个迁移撤销 anon/authenticated 既有权限，再只授予 authenticated SELECT 与 `first_name,last_name,avatar_url` 列 UPDATE，并加入 restrictive owner policies。浏览器不负责 INSERT profiles，交给 trigger。单独执行第一个迁移会保留其他同表策略，需要检查是否有旧的宽松策略。

`avatars` 为私有 bucket，限制 5,242,880 字节和三种 MIME；SELECT / INSERT / DELETE 的 policy 限定 bucket 与第一层目录为当前用户 UUID。更新头像使用新路径并删除旧对象；数据库保存失败会尝试清理新对象。清理失败仍可能产生孤儿对象，后续可单独核查。迁移不会自动移除其他 Storage policies，必须检查旧策略。

### Assignment #4

| 表 | 主要字段 / 约束 | 目标权限 |
|---|---|---|
| `places` | text id、名称、类型、地址、描述、访问提示、来源和核查日期；003 加区域、经纬度、坐标来源 | 登录用户只读 |
| `generation_attempts` | uuid id、user_id、created_at、used | 本人只读；RPC 预留额度 |
| `generations` | uuid id、creator_id、唯一 attempt_id、JSONB content、mood、duration、model、created_at | 登录用户可读社区内容；禁止直接写入 |
| `generation_prompts` | generation_id 主键、user_id、prompt | 仅本人读取；RPC 原子保存 |
| `votes` | uuid id、user_id、generation_id、±1 value、时间；用户与路线组合唯一 | 本人读及插入；不开放直接 UPDATE |
| `generation_illustrations`, `illustration_prompts`, `illustration_designs` | 历史插画状态、prompt 与设计 JSON；详见 004/005 | 各自 RLS；当前主页面不读取这些表 |

`reserve_generation()` 用按用户的事务锁限制滚动 24 小时最多 5 次尝试，失败的模型请求也消耗额度。`save_generation(...)` 核查身份、预留、内容与时长，原子写路线和 prompt。`vote_totals(uuid[])` 只给登录用户聚合计数，不公开其他人的原始投票。相关 definer 函数设空 search_path，撤销 public/anon EXECUTE，只开放所需 authenticated 执行权限。

002 为 public schema 所有现有表开启 RLS，且引用既有 `coffees`。它不是空数据库的完整初始化脚本；也包含不可重复创建的 policy。004/005 含普通 CREATE TABLE，同样不要盲目重跑。先对比已应用状态、备份和差异，再选择需要的迁移。004/005 为历史插画功能，不应因当前地图展示而强制重装。

## 7. Auth / OAuth 配置核对

完整跳转：浏览器 `/login` → Supabase authorize → Google → **Supabase `/auth/v1/callback`** → **应用 `/auth/callback?code=...`** → 建立 cookie 会话 → `/profile` 或 `/`。

1. 在现有 Google Cloud 项目找到 Web application OAuth client，确认 consent screen audience / test users 能覆盖验收账户。
2. Authorized JavaScript origins 使用网站 origin（无路径）；本地开发使用实际本地 origin。
3. Google Authorized redirect URIs 填 Supabase Google Provider 页面给出的 callback：`https://<PROJECT_REF>.supabase.co/auth/v1/callback`。不要把应用 `/auth/callback` 填作这个地址。
4. Supabase Google Provider 启用并保存正确 Client ID / Secret。
5. Supabase URL Configuration 的 Site URL 填已确认的生产 origin；Redirect URLs 加实际应用 `https://<部署域名>/auth/callback`，本地需要时加 `http://localhost:3000/auth/callback`。代码根据当前浏览器 origin 生成 redirectTo，预览部署也必须匹配其真实域名。
6. 保持授权发起与返回使用同一部署域名，避免 cookie / PKCE verifier 丢失；部署域名改变时更新 allowlist。
7. Vercel 验收部署按课程要求关闭 Deployment Protection，并检查该部署自身的设置及 callback 可访问性；当前未操作控制台。

本次已读取 [Supabase Google OAuth 文档](https://supabase.com/docs/guides/auth/social-login/auth-google)，核对了两个 callback 的职责及 PKCE code 交换流程。SSR 客户端参考 [官方说明](https://supabase.com/docs/guides/auth/server-side/nextjs)。控制台具体值仍未读取。Next.js 代码变更前按 `AGENTS.md` 阅读本地 `node_modules/next/dist/docs/` 相应指南。

## 8. 尚未完成 / 尚未证明的事项

| 优先级 | 事项 | 完成标准 |
|---|---|---|
| P0 | 核实 Supabase 项目、迁移、RLS、trigger 实际状态 | 执行只读 audit，记录缺项及权限；不输出用户资料 |
| P0 | 验证 Google OAuth 和姓名补全闭环 | 新用户/已有用户都跑通，刷新保留登录，退出后无法读取受保护数据 |
| P0 | 验证 Vercel 最新实际部署 | 确认构建成功、部署 commit 与目标一致、提交链接无需 Vercel 登录 |
| P1 | 双账户数据隔离验收 | A 不能读取/修改 B 的 profile、头像、prompt、原始 votes；匿名无数据访问 |
| P1 | 确认课程原始 rubric 和提交要求 | 本次没有完整题目或课程提交证据，不能把“有代码”算“已交作业” |
| P1 | PM 反馈与对应修改 | `COFFEE_WALKS.md` 明确写 feedback group 未完成；记录真实观察和改动 |
| P1 | Assignment #4 在线生成与投票复验 | 模型可用、配额、刷新持久化、重复投票失败 |
| P2 | 整理历史插画说明与当前地图行为 | 保留数据；文档明确旧模块状态，避免误导下一位维护者 |

不需要重新实现已经存在的 Assignment #3。当前没有经验证的业务代码缺陷需要盲改，优先补齐线上验收证据。

## 9. 安全与已知边界

- 页面保护与 RLS 都需要；隐藏按钮不能阻止直接调用 Supabase API。`proxy.ts` 刷新会话，不能单独视为访问控制。
- 姓名补全是应用页面的门槛，当前 RLS 主要按认证与所有者授权；不要宣称数据库所有 API 都强制完整姓名。
- definer 函数须核对所有者、固定 search_path、参数验证与 EXECUTE grants；不能仅看“开启 RLS”就判定安全。
- MIME 和大小限制已经实现；本次未验证文件签名检测或恶意内容扫描，不宣称已提供。
- 本人之外不可读 profiles，因此 `/members` 当前是欢迎页。如果 rubric 要所有成员列表，需另行设计最小公开字段与权限。
- Google Maps 区域预览不是按路线计算的精确地图；步行方向链接才传递实际站点顺序。地点营业状态和可达性仍需出发前检查。
- 历史插画存在并不证明当前模型可用、免费额度可用或图片生成已通过验收。

## 10. 验证与提交 checklist

### 本地

- [x] 从 GitHub 核对仓库、最近提交与 Profile 实现。
- [x] `npm run lint`：本次退出码 0。
- [x] `tsc --noEmit`：本次退出码 0，TypeScript 检查通过。
- [x] `node --test tests/routes.test.mjs tests/map-design.test.mjs`：11 项全部通过；出现 module 类型提示，不影响结果。
- [ ] `npm run build`：本次未通过。第一次无法下载 Google Geist 字体；放宽运行权限后重试遇到 Turbopack 子进程绑定端口 `Operation not permitted`。这证明当前执行环境未完成构建，尚不能判定生产部署代码失败；需在具备网络和进程权限的本地/Vercel 环境复验。
- [ ] 真实配置下本地打开 `/login` 并执行 OAuth；构建检查不能代替此步骤。

### Auth / Profile（建议用两个测试账户和无痕窗口）

- [ ] 未登录直接打开 `/`、`/members`、`/profile`、`/explore`，跳到 `/login`，页面不泄露业务数据。
- [ ] 首次 Google 登录后 profiles 自动出现，姓名为空时进入补全页。
- [ ] 空白姓名被拒；trim 生效；每项超过 80 字符被拒。
- [ ] 保存姓名后进首页；修改、刷新、重新登录都可读到持久化内容。
- [ ] 上传合法头像成功；超限及不支持格式被拒；刷新可显示；另一个账户不能访问对象。
- [ ] 退出后原受保护链接失效；旧页刷新不显示私人内容。
- [ ] callback 缺 code / 失败时回登录；取消 Google 授权后可重试。

### 数据库与扩展

- [ ] 执行 `supabase/audits/project_state.sql`，核对 RLS、trigger、grants、bucket 元数据及缺失 profile 数。
- [ ] 两个真实账户验证读取/更新隔离，不能只用 SQL Editor 的管理员身份判断 RLS。
- [ ] 如需验证 AI RPC，可审核后运行现有 `supabase/tests/coffee_walks.sql`；它在事务中写测试数据并 rollback，**不是纯只读 audit，本次未执行**；需要测试用户及剩余额度。
- [ ] 生成路线刷新后保留；只能引用目录地点；prompt 仅创作者可见。
- [ ] 投票持久化、同一用户同一路线不能重复投票、聚合计数正确；额度限制生效。

### 提交

- [ ] 核对老师原始题目、所需截图/说明、截止日期和提交入口。
- [ ] 记录最终 Git commit、Vercel 部署独立 URL、部署时间和构建结果。
- [ ] Preview / Production 所需环境变量齐全，callback allowlist 匹配提交部署。
- [ ] 无痕窗口确认老师无需 Vercel 账户即可进入登录流程。
- [ ] 只提交要求的链接与材料，不附密钥、cookies、用户资料、授权 code 或签名头像地址。
- [ ] 记录课程平台提交时间/回执；目前无回执，保持未勾选。

## 11. 下一次直接从这里继续

1. 打开既有 Vercel 项目 Deployment Details，确认目标提交及独立部署 URL；先不创建新项目。
2. 打开同一 Supabase 项目的 SQL Editor，运行本文配套的只读 `supabase/audits/project_state.sql`。比较第 6 节，补记真实 schema / policy / trigger。若有缺项，先准备针对性迁移，再验证；不要整包重跑。
3. 核对第 7 节 Google/Supabase 两层 callback 与 test users；在无痕窗口跑第 10 节 Auth 流程。
4. 优先修复实际失败的步骤，复验后填写下表；若全部通过，把 Assignment #3 状态改为“部署验收通过”，附日期和部署 URL。
5. 再核对 Assignment #4 模型与投票，并完成真实 PM feedback；最终按 rubric 提交。

## 12. 持续更新记录

| 日期 | 变更 / 验证 | 证据 | 待办 |
|---|---|---|---|
| 2026-10-15 | 初次整理；核对聊天、两份本地副本、GitHub；确认 #3/#4 代码存在 | 基线 `cfaf091`，Profile 远程文件与本地一致 | 线上 Auth / 数据库 / Vercel 验收 |
| 2026-10-15 | lint 和 11 项测试通过；准备只读数据库 audit | 本次命令退出码 0 | SQL 未执行 |
| 2026-10-15 | TypeScript 检查通过；README 增加文档入口 | `tsc --noEmit` 退出码 0 | 线上验收待继续 |
| 2026-10-15 | 生产构建两次均未完成 | 字体网络请求失败；重试遇到 Turbopack 进程/端口权限错误 | 在支持的构建环境重跑 |

后续追加模板：日期｜目标 commit / 部署 URL｜具体操作｜验证结果和截图位置（去敏）｜未解决项｜下一步。仅在实际通过时打勾；计划、代码、部署、验收、提交分别记录。

### 2026-10-15 后续实施与故障修复

当前产品已扩展为 STAGED PARIS：《巴黎圣母院》原著地图、格兰古瓦视角、单人路线与朝圣簿。原 Google 登录、姓名/头像、咖啡推荐与评分入口保留。原 Supabase 项目已执行文学数据迁移，实际数据 51 地点、29 人物、74 场景；云端收藏与刷新持久化已验证，文学路线 RPC/RLS/评分约束事务测试 PASS（测试回滚）。

修复地图 `_leaflet_pos` 类错误：关闭地图动画、停止移动并在切换/卸载时解绑提示层。浏览器复测地图缩放、视角切换、标记选择及导航通过。推荐页在没有 Gemini 密钥时提供明确标注的原著资料库规则推荐；实际保存 90 分钟三站路线并刷新验证，评分入口可用。未代用户投票，未声称 AI 调用成功。

本轮 TypeScript、ESLint、16 项测试和 webpack 生产构建通过。详细当前部署/数据库状态及操作见 `STAGED_PARIS_SETUP.md`，本文件此前的首次核验记录保留作历史，不应将其中待执行状态当作最新状态。新版本仍未推送 GitHub 或部署 Vercel。

### 2026-10-15 路线地图缩略图

每条巴黎推荐路线（含已有记录和预览）新增独立地图，使用该路线有序地点坐标，显示编号、地点名称和顺序虚线，自动适配范围；保留实际步行导航。地图按可见区域延迟加载，评分刷新不会因相同地点重建地图，关闭动画并在卸载时清理提示层。虚线只表示停靠顺序，不宣称是道路路径。浏览器确认多条路线各自正确标注，控制台无错误；TypeScript、ESLint 与 webpack 生产构建通过。截图：项目根目录 `paris-route-thumbnails.jpg`。

### 2026-10-15 人物视角与自由探索

推荐页新增生成前的视角选择：格兰古瓦、艾丝美拉达、卡西莫多、克洛德·弗罗洛、自由探索。人物选项按原著中的实际到访关系筛选候选地点与场景，自由探索不限定人物；选择会传给资料库推荐和 AI prompt，并作为 content.perspective 保存，路线卡片显示视角。旧记录缺少字段时按格兰古瓦解释。原有地图、导航、评分与额度保留。

原 Supabase 已执行增量迁移 `202610150003_journey_perspectives.sql`；同一保存 RPC 支持五种视角并拒绝无效人物/错误场景关联，不放开表写入权限。数据库事务测试五种视角保存、非法视角及人物场景不匹配拒绝通过，测试回滚，不消耗账户额度、不留下测试路线。18 项测试、ESLint 与生产构建通过；浏览器确认选项切换与旧路线正常。真实 Gemini 调用仍未验证。截图：项目根目录 `paris-perspective-selection.jpg`。

### 2026-10-15 两页探索流程

按用户澄清拆分页面：`/journeys` 仅选择人物/自由探索、故事主题与时长；点击“查看我的探索路线”后，登录模式先生成保存，成功再跳到 `/journeys/routes`（READ THE CITY, WRITE THE JOURNEY），集中显示路线、地图、导航与评分。失败留在选择页显示原因，不伪造成功。结果页可返回重新选择，入口页也能直接查看已有路线，不消耗推荐额度。评分刷新改为更新结果页。

预览模式通过 GET 传递三个选择到独立结果页，明确标记未保存且禁用评分。浏览器已验证自由探索/故事中的抉择/60 分钟选择完整传递、结果内容对应、已有真实路线显示及返回第一步。ESLint 和生产构建通过，新路由已编译。本地预览重启后使用新版本。截图：`paris-step-one.jpg`、`paris-step-two.jpg`（项目根目录）。

### 2026-10-15 路线默认折叠

结果页改为单列标题列表，每条路线默认收起；点击标题或加号展开，再次点击收起。地点说明、地图、导航、评分和生成依据保留在详情内。使用原生 details/summary 支持键盘操作；地图在展开可见后加载，忽略隐藏容器的尺寸变化。TypeScript/ESLint 通过；浏览器确认默认折叠、展开后地图标记及重新折叠，控制台无错误。截图：`paris-collapsed-routes.jpg`（项目根目录）。

### 2026-10-15 黑白舞台视觉与诗意导语

路线收起态改为紧凑网格卡片，标题下显示人物视角 tag；展开后保留地图/评分，并自动请求服务端诗意导语。导语只传入按路线顺序整理的目录地点与原著事件，不发送私人笔记或用户身份；检查所有地点被提及、纯文本长度及输出结构，明确标记 AI 创作非原文。已登录且有权读取该路线才请求模型；实例内缓存一小时、并发合并及每用户每分钟三次限制（不是跨实例持久配额）。缺密钥时真实显示不可用，未声称模型调用成功。20 项测试通过。

整体文学界面改白底黑字、等宽打字机字体；登录页重设计为舞台/剧票布局，双侧白幕约 2.7 秒展开，文字渐显；减少动态偏好直接显示静态页面。Google OAuth 与预览入口保留。ESLint、TypeScript 及生产构建通过。截图 `paris-theatre-login.jpg`、`paris-route-label-cards.jpg`。

Gemini 排查：桌面原项目及当前项目 `.env.local` 均只有 Supabase 两项变量，未发现 Gemini 变量。Vercel 账户已进入 quiestqi 项目列表，见 hello-world-nextjs；打开项目详情多次 ERR_NETWORK_CHANGED，尚未读取环境变量、未复制密钥、未改云端配置。需要网络恢复后继续从该项目 Settings → Environment Variables 核对 GEMINI_API_KEY 并接入本地，之后实测真实生成。无密钥值写入文档或聊天。

### 2026-10-15 个人资料页视觉更新

`/profile` 统一黑白打字机视觉与品牌导航，采用漫游者档案卡＋编辑区布局；档案卡显示现有头像、姓名及账户就绪状态。姓名与头像分区，补充保存/上传中的禁用与提示，错误文案中文化，去掉重复出发按钮，保留地图、选视角与已保存路线入口。移动端切为纵向布局。

原 `app/profile/actions.ts` 未改，原姓名校验、Google 会话、头像类型/大小限制及私有头像签名读取继续使用；未在验证中改动用户姓名或头像。TypeScript 与 ESLint 通过；浏览器验证已登录资料正确显示、两份表单与字段完整、当前宽度无横向溢出、控制台无错误。截图 `paris-reader-profile.jpg`（项目根目录）。

### 2026-10-15 指定账号无限测试

按用户明确要求，已在原 Supabase 项目为用户指定的现有账户加入巴黎路线无限测试名单。新增迁移 `202610150004_literary_test_accounts.sql`：名单仅管理员可写，应用不能读取/修改名单，状态 RPC 仅返回当前登录者是否豁免。生成预留只对名单账号跳过每日 5 次检查，其他身份、资料完整性、路线依据及保存校验保留；仍记录尝试。UI 对该账号显示“无限测试账号 · 不受每日 5 次限制”。通用安装脚本包含表及函数，不包含私人账号配置。

实际数据库事务测试连续 6 次预留成功、名单客户端不可访问、非名单账号不豁免，结果 PASS；测试预留已回滚。TypeScript/ESLint 通过；浏览器实际账号可读取无限提示。未删除原尝试记录，不涉及 Gemini 服务自身的限额。截图 `paris-unlimited-test.jpg`。

### 2026-10-15 Gemini 真实接通（最新状态）

已访问原 Vercel 项目环境变量页，确认 GEMINI_API_KEY 存在、仅 Production、Secret 类型保存后不可回读。随后从用户原 Google AI Studio 课程项目的已有密钥详情中读取密钥，写入当前项目 `.env.local`，文件权限 600 且已被 Git 忽略；未改 Vercel 密钥、未创建/轮换密钥、无密钥值写入此文档或仓库。环境变量自动重载后，浏览器展开现有弗罗洛路线，Gemini 真实返回约 200 字中文诗意导语，包含司法宫、格雷沃广场、巴黎圣母院，页面显示 AI 创作标注。截图 `paris-gemini-poetry-live.jpg`。这是实际模型调用成功，不是模板或仅配置检查。

读取详情时，新格式密钥未被原先只匹配旧格式的输出过滤覆盖，工具回显过一次；不在文档中记录该值。应由用户在控制台轮换该密钥后，再更新对应环境变量。

### 2026-10-15 STAGED CITY / 内置中英双语（最新）

品牌、页面标题、SC 标记与应用包名统一为 STAGED CITY；原 Vercel/GitHub 项目标识与数据库项目不改，以保留现有部署关联。页面仍为黑白打字机风格，主地图和路线缩略图恢复暖纸色、低饱和褐色底图与酒红标记，保留真实 OSM 参照坐标和署名。

页面右上角内置中文/English 切换，默认英文；通过一年有效的语言 cookie 记住用户选择，刷新/跨页保留。布局服务端读取语言、客户端上下文与 React 文本/可访问性标签一起更新；不通过修改 DOM 文本实现翻译。登录、资料、地图、两步推荐及原咖啡页面的界面支持切换。表单提交的视角、主题、时长保持稳定值，避免中文标签影响验证。个人姓名、笔记等用户数据不改写。

英文目录保存在 `data/nddp-novel.en.json`，与原中文目录并行；51 地点、29 人物、74 场景的 ID、人物关系、章节及 evidence 完全一致。已校正英文翻译中的若干专名（Jacques Charmolue、Pont aux Meuniers、Petit-Châtelet、Rue des Bernardins、Port-au-Foin 等），保留原文不确定性。法文原名称作为对照保留。历史路线按当前语言显示对应人物/地点/原著依据，不覆盖数据库旧内容。

新路线与诗意导语的模型请求跟随当前语言。导语按语言分别缓存和校验；展开中切换语言会读取/生成对应版本。浏览器已实际验证同一条路线由 Gemini 分别返回中文及英文导语，并确认展开状态保留；中文自由探索＋故事中的抉择＋60 分钟能提交到独立结果页且参数正确；刷新语言保留，个人资料及登录页切换入口正常。

验证：ESLint、24 项测试、webpack 生产构建通过；最终刷新后地图运行无新错误。截图 `staged-city-bilingual-map.jpg`、`staged-city-map-zh.jpg`、`staged-city-english-map.jpg`、`staged-city-poetry-en.jpg`。开发时热更新曾出现 effect 依赖数组变更提示，最终完整刷新后未复现。仍为本地修改，未推送 GitHub/部署新版。

## 2026-10-15 — 三段使用流程 refinement（本地已实现，数据库已迁移）

目标受众：希望用诗意方式探索城市的戏剧／文学爱好者。流程调整为：

1. **故事地图 `/`**：先看作品的整体空间，选择地点阅读原著场景。未登录也能浏览；原有姓名补全和生成登录要求保留。私人笔记编辑从这里移至第三部分。
2. **我的旅程 `/journeys` → `/journeys/routes?batch=…`**：先选角色，再选实际起点（只提供该角色有原著依据的地点）、六种故事线索、建筑／人文／河岸自然的多选偏好，以及最多 400 字的愿望。Gemini 一次返回三条候选，原子保存；一次批次仍计一次配额。当前批次页只展示该批次，已有路线页只展示本人路线。展开有诗意导语、地图和原著依据；选定今天的旅程后才出现意愿评分。选定状态保存在数据库，刷新保留。移除显式预计时间和每站停留时间；内部保守距离／时间校验仍保留，不作为对用户承诺的预计时间。
3. **城市回声 `/stories`**：可在巴黎中心范围自由 pin，不局限于原著地点，写最多 1000 字。默认私人，用户可明确选择匿名公开。地图点开小对话框显示文字，不显示姓名和账号。`/stories?view=notebook` 保留既有地点收藏、到访和私人手记。

新增数据库迁移：`202610150005_city_echoes.sql`、`202610150006_journey_options.sql`，已在原 Supabase 项目运行成功。新增 `literary_echoes`（本人读取／移除，RPC 控制写入，每人每日最多 20 条）；公开只经 `read_city_echoes` 读取经过字段筛选的数据，不返回 user_id；私人内容不会自动公开。新增 `literary_journey_choices`，只能保存本人路线为今天的选择。`save_literary_options` 在同一事务里复用已有原著场景验证，最多三条，预留机会不可重复使用，失败不留下部分候选。一个 attempt 对应多个候选，因此移除原 attempt_id 的唯一限制。

实测证据：浏览器真实 Gemini 已生成三条中文路线（圣母院起点、格兰古瓦、建筑、庇护与独处）；选定后出现意愿评分并保存。地图点击可落点，私人为默认选项。`city_echoes.sql` 事务检查通过：跨用户隔离、匿名读不到私人记录、公开字段无作者身份。`journey_options.sql` 事务检查通过：一次预留三条候选、原子回滚、禁止 replay、选定状态私有。测试数据均回滚，没有发布示例公共感受。

校验：27 项本地测试通过，lint 通过，生产构建通过。当前仍为 localhost 版本，未推送／未部署到 Vercel。同批次诗意导语本次亦已生成成功；首次响应曾失败，界面显示重试，后续成功显示三站中文导语。模型服务仍可能失败，不伪造成功。刷新后「今日选定」及评分出现顺序已验证。

后续可继续 refine：故事线索／偏好选择的排版与文案；重新定制时自动带回已选偏好；公开回声的举报／管理与分页；自由探索地图的键盘落点；部署前重跑数据库脚本于空环境。现有登录、Gemini、无限测试账号、收藏与评分均保留。

## 2026-10-15 — 第三部分重新聚焦为整体地图

根据用户进一步澄清，第三部分取消上方大幅介绍和左右分栏表单，改为导航下方整幅巴黎地图。轻量标题浮在地图左上，私人手记仅作为小入口。交互缩减为：点击地点 → 地图上原位卡片确认「在这里放置标记」→ 同一卡片写文字并保存。地图已有标记点开阅读小对话框。匿名公开收拢为一个可选勾选项，默认仍私人；数据和 RLS 沿用已验证的城市回声存储，未改公开范围。

实现采用地图原位弹窗承载 React 表单；修复弹窗内容更新后点击事件穿透到地图、导致重新落点的问题。中英文文案同步添加。浏览器实测选点、放标记、输入文字均成功；截图中的示例文字仅作为未提交的草稿，没有公开或新增数据库记录。地图布局和编辑卡片证据为工作区 `staged-city-open-atlas-editor.jpg`、`staged-city-open-atlas.jpg`。新版本仍仅本地运行。

## 2026-10-15 — 中世纪手抄本外观与可读哥特字体

全站增设手抄本主题：淡羊皮纸底色与程序纹理、褐墨／暗红／旧金色、细双线边框；地图、旅程、资料页、登录页及旧咖啡页同步。英文标题及品牌采用本地托管的开源 **Grenze Gotisch** 可变字体（OFL 授权文件一并保存），中文标题以楷体／宋体衬线回退匹配气质，正文保留可读衬线字体。首轮尝试较繁复的 Unifraktur Maguntia 后，依据用户反馈改为 Grenze Gotisch；当前不会加载首轮字体。移除 Explorer 的 CathedralDrawing 组件及作品卡片旁的圣母院线稿，释放标题宽度。

根布局加入 9 枚鼠标箭头的延迟跟随效果：墨色／暗金箭头沿前一个位置逐级跟随，停止后收拢淡出；保留系统光标，装饰层不拦截点击；输入框内隐藏，触屏与减少动态效果偏好关闭；隐藏标签页／离开窗口停止动画。浏览器已确认 9 枚元素实时位移、pointer-events 为 none，地图选点／原位文字输入仍可操作。

检查：lint、TypeScript 通过；全站主题及光标引入后的生产构建通过。浏览器截图确认作品卡片 SVG 数为 0，中文标题及品牌显示正常，字体实际加载成功。仍为本地更新，未部署。

### 字体再次微调：折中版本
用户认为 Grenze Gotisch 不如前版，并希望中和。当前已改为本地 **Almendra Regular**（OFL）：保留中世纪手写衬线与少量装饰，使用常规字重，标题尺寸略收敛。当前实际字体源为 `/fonts/Almendra-Regular.ttf`；前两轮字体不再被 CSS 加载。圣母院线稿继续移除，纸张配色与光标群保留。此轮仅字体资源与 CSS 调整，浏览器实际显示已检查。

### 最终选择：恢复第一版
用户最终明确选择第一版哥特字体，已恢复本地 Unifraktur Maguntia 及第一版主要标题尺寸。圣母院线稿仍然移除；羊皮纸主题与光标群不变。Almendra 与 Grenze 不再被 CSS 加载。

## 2026-10-16 — 白底黑字与生成失败修复

根据最终外观要求，页面、卡片、表单、登录等改回白底黑字，移除纸张色与纹理、暗红与旧金文字。第一版 Unifraktur 哥特标题与跟随光标保留，光标改为黑色。地图底图仍沿用前述羊皮纸滤镜，界面覆盖层改为白色。

生成失败已实际复现。安全日志定位到原先模型返回的 stop.minutes 不符合 5–30 整数约束（Invalid stop minutes），导致整组三候选被拒绝。重构为：程序先用原著资料和空间规则构建最多 12 个可行方案；Gemini 从中选 3 个路径编号并写标题、概述、逐站文案；程序还原固定地点／场景／顺序／内部时长，再执行原有完整校验与原子保存。模型不再填写可导致失败的内部时长、地点和场景 ID。校验没有放宽；模型不能更换原著关系。新增纯逻辑测试遍历全部角色和全部可用起点，验证均能得到至少三条方案，且乱填路径、重复方案、超长理由被拒绝。

浏览器实测英文默认生成成功，日志显示模型生成约 7.7 秒、连同页面跳转约 9.3 秒，三条结果已存原 Supabase。发现之前旧页面还保留已退出登录的界面；已通过 Google 原测试账号恢复登录，并将服务端确认登录失效的生成动作改为跳转登录。没有更换密钥或调整数据库权限。

### 点击交互复核
用户进一步说明「点击后没有反应」。已在其原 `/journeys` 页面实际点击按钮，成功跳转到新的三条中文路线结果。另一次生成也保存成功。新增提交中的可见状态提示与忙碌标记，结果页新增「三条新旅程已生成」提示，并在新批次进入时滚动到顶部，避免跳转后停留在旧页面滚动位置而看不到结果。白底黑字、原哥特字体保留。29 项测试与生产构建通过，之后新增的提示组件另经 lint 与 TypeScript 检查。没有把尚未复现的鼠标按钮硬件／浏览器问题认定为已修复；本次可确认原页面提交、生成、保存和跳转链路正常。

### 非哥特部分统一为打字机字体
按用户最新要求，保留哥特标题、品牌及角色标题，其余正文、导航、按钮、输入、说明、地图标签与弹窗统一采用 Courier New 等宽字体栈，中文以可用的等宽／系统字体回退。白底黑字与光标群不变。

### 光标图标改为极简燕子
根据用户要求，将游动群的箭头 SVG 换为尖翅、分叉尾的小燕子剪影，保持黑色、9 只、延迟跟随、输入区隐藏及不拦截点击等行为。非哥特部分已统一为打字机等宽字体。

### 跟随图标调整为小鸟
用户认为燕子轮廓像飞机，改为非对称的圆头、短尾、弯曲上扬翅膀的小鸟剪影，加一个细小眼点，保留原跟随行为。

## 2026-10-16 — Vercel 发布准备
用户已明确授权更新原 Vercel 项目。当前 lint、29 项测试及 production build 全部通过；待发布文件已检查无 Gemini 私钥，.env.local 继续被忽略。生产构建固定为 next build --webpack，与本地验证一致。已确认原项目关联 quiestqi/hello-world-nextjs，生产环境已有 GEMINI_API_KEY 及 Supabase 两个配置；不上传本地密钥。正在提交 main 并等待原 Vercel 项目自动部署，最终 Ready 状态及线上验证记录随后补充。


## 2026-10-16 — 已正式发布到原 Vercel 项目

- 正式网址：https://hello-world-nextjs-peach.vercel.app/
- Vercel 原项目：quiestqi/hello-world-nextjs。
- 已推送 GitHub main：927bac6092dff69b10c1aa0f7ac59ff34fe8e6ec。
- 对应部署：GNFkpoC1TT6r2Wk6JXhjRVn7YYyk，Production / Current / Ready，Vercel 构建耗时 58 秒。
- 发布前 lint、29 项测试、webpack production build 通过；生产环境原有 Gemini 与 Supabase 配置保留，没有上传 .env.local 或复制任何私钥到仓库。
- 正式域名实际验收：未登录可浏览故事地图；Google 原测试账号登录成功并返回正式域名；姓名与云收藏加载正常；生成页识别无限测试账号；真实 Gemini 一次生成三条英文路线、保存并跳到新批次；展开地图后瓦片与标注正常；城市回声地图读取到已有标记。
- 截图：工作区 staged-city-production.jpg、staged-city-production-routes.jpg、staged-city-vercel-ready.jpg。没有发布测试公共回声。

此前各日期标注的「本地未部署」是当时的历史状态；当前线上以本条发布记录为准。此段为发布后本地验收记录，线上源代码提交仍是上述 927bac6。


## 2026-10-16 — 入口改为必须登录
用户明确要求先登录，再进入地图和三个步骤。首页未登录直接跳 /login；proxy 对所有内容路由统一验证会话，包括 /preview、/journeys?preview=1、/journeys/routes?preview=1、/stories。原预览路由不再展示内容，已登录访问会返回首页。登录页移除「先浏览」链接。各主要服务端页面也保留身份校验，登录和 OAuth callback、字体等静态资源保持可访问。已有有效会话的用户可直接继续探索，不强制重复登录。

31 项测试、lint、生产构建通过。匿名本地 HTTP 检查：首页、旧预览、旅程与回声路由全部 307 到 /login；/login 与哥特字体 200。接着推送 main 更新原 Vercel 项目并验证正式域名。
