# RealWorld Web Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 构建连接现有 Java API 的完整 Vue 3 桌面文章社区。

**Architecture:** `src/api` 封装类型及 Axios，`src/stores` 管理会话，`src/router` 管理鉴权，`src/components` 提供公共视觉与文章组件，`src/views` 实现业务页面。页面以现有 Java 接口为约束，不使用静态示例替代业务。

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus, Vue Router, Pinia, Axios, SCSS, ESLint, Prettier, Vitest, Vue Test Utils, Playwright。

**Spec:** `docs/superpowers/specs/2026-09-30-realworld-web-design.md`

## Global Constraints

- 新目录 `realworld-web`，保留 uniapp-v2/RealWorld 和已有用户改动。
- 所有业务端点除登录注册均需登录；开发 `/api` 指向 8080。
- 用户名不可修改；authorId 显式提交；空密码省略。
- 不实现不存在的文章更新端点，不迁移旧 Agent。
- 在本地工作区完成，不自动提交、推送、发布。

## Review Focus

- 损坏或过期会话可安全恢复，晚到 401 不清理新登录。
- 作者切换和快速搜索不显示旧数据，失败可重试。
- 空密码、失败保存和重复提交不损坏个人资料。
- Markdown HTML、危险链接和站外登录重定向不能执行或跳转。
- 浏览器刷新深链接、移动宽度、空集合与网络错误可使用。

## Task 1: 工程和 API 会话边界

Files: `realworld-web/package.json`, config files, `src/api/{types,http,index}.ts`, `src/stores/auth.ts`, `src/utils/{session,validation,markdown}.ts`, `src/api/*.test.ts`, `src/utils/*.test.ts`.

- [x] 配置工程，安装依赖并写 HTTP/API/会话/校验测试，运行观察失败。
- [x] 实现 `createApi(client, getUserId)`、业务结果处理和持久化会话；API 形状严格按 Java Controller。
- [x] 测试正常数据、无 data 成功、业务与 HTTP 401、旧 Token、作者 ID、资料白名单、空密码、损坏存储、Markdown 安全。
- [x] 运行测试及严格类型检查。

## Task 2: 导航、账户和个人资料

Files: `src/router/index.ts`, `src/App.vue`, `src/components/{AppHeader,UserAvatar,AsyncState}.vue`, `src/views/{AuthView,SettingsView,NotFoundView}.vue`, `src/styles/main.scss`, related component tests.

- [x] 编写登录、注册和资料保存组件测试，观察缺失实现失败。
- [x] 实现响应式公共布局，登录守卫、站内重定向、登录注册校验和会话恢复。
- [x] 实现资料加载与重试、禁用用户名、空密码不提交、保存同步 Pinia、避免旧会话写入。
- [x] 运行组件测试和类型检查。

## Task 3: 文章、评论、作者主页和关系

Files: `src/views/{HomeView,ArticleView,EditorView,ProfileView}.vue`, `src/components/{ArticleCard,ArticleList,MarkdownBody}.vue`, `src/composables/useLatestTask.ts`, component tests.

- [x] 编写列表搜索、详情收藏评论、发布和作者查询关键行为测试并观察失败。
- [x] 首页分页搜索与标签查询，个人主页作者文章/本人收藏/关系标签页，取消关注刷新状态。
- [x] 安全 Markdown 阅读、收藏、发表评论和确认删除本人内容；发布传 tagsId，成功跳转本人主页。
- [x] 列表无标签筛选接口，标签仅展示；分页与搜索严格反映后端支持范围。
- [x] 完成加载/空状态/错误重试和异步过时保护，运行测试和构建。

## Task 4: 完整验收和交付

Files: `e2e/*.spec.ts`, `playwright.config.ts`, `.env.example`, `README.md`, `deploy/nginx.conf.example`.

- [x] Playwright 拦截模拟 Java API，覆盖登录、搜索分页、阅读评论收藏、作者与关系、发布、资料更新、过期会话、深链接和移动视口。
- [x] 运行 `npm run test`, `npm run type-check`, `npm run lint`, `npm run build`, `npm run test:e2e`。
- [x] 探测本机 Java 8080 的连通性，记录是否做真实数据库联调。
- [x] 使用 requesting-code-review 独立审查，修复重要问题后复验。
- [x] 完成 README 和 Nginx 示例，交付启动命令及验证结果。

