# RealWorld Web

独立的桌面文章社区，使用 Vue 3、TypeScript、Vite、Element Plus、Vue Router、Pinia、Axios 和 SCSS。保留同级 `uniapp-v2`，复用同级 `RealWorld` Java 后台。

## 启动

需要 Node.js 22.12+（开发验证环境为 22.22.2）。

```powershell
cd E:\面试项目\fgl1998-repo\realworld-web
npm ci
npm run dev
```

访问 http://127.0.0.1:5173。开发时默认通过 Vite 将 `/api` 转发到 `http://118.24.53.49:8080`。后台除登录、注册外的接口都要求 Bearer Token，因此需先用 Java 后台已有账号登录，或注册新账号。

如需调整后台地址，复制 `.env.example` 为 `.env.local`，修改 `API_PROXY_TARGET` 后重启开发服务器。不要在浏览器环境变量中放数据库密码、JWT 签名密钥等服务端配置。

智能助手复用同级 `realworld-agent-v2`，开发代理将 `/api/agent` 转发到 `http://127.0.0.1:3002`。先启动该服务，或在 `.env.local` 中通过 `AGENT_PROXY_TARGET` 指定部署地址，再重启 Web 开发服务器。Agent 和 Java 后台需要能验证同一个登录 Token。

## 已实现

- 登录、注册、持久化会话、业务 401 与 HTTP 401 处理、登录后回到原页面。
- 首页文章分页、关键词搜索、标签展示、作者入口、收藏状态展示。
- Markdown 阅读、收藏与取消收藏、评论及确认删除本人评论、确认删除本人文章。
- 发布文章、选择标签、Markdown 预览；发布成功进入当前用户主页。
- 作者主页及显式 `authorId` 文章查询、关注/取消关注、关注列表和粉丝列表；本人主页另有收藏列表。
- 编辑邮箱、简介、头像 URL 和可选密码；用户名只读，空密码省略。
- 智能助手：自动恢复当前账号的对话历史、发送问题、失败重试、安全 Markdown 回答、展开工具调用与执行过程、确认清空历史。桌面通过主导航进入，手机浏览器通过账户菜单进入。
- 加载、空状态、错误重试、404、桌面与移动浏览器适配。

Java 目前没有文章更新或按标签筛选接口，因此不展示这些操作。头像目前使用公开图片 URL，没有新增上传入口。

助手调用 `POST /api/agent/chat` 时仅传 `{ message }`，问题最长 2000 字，等待时间最多 120 秒；历史和清空接口分别为 `POST /api/agent/history`、`POST /api/agent/clear_history`。回答完成后重新读取历史以补齐执行过程；读取失败时保留回答，并提供单独重试历史的入口。登录过期会回到登录页，登录后返回助手页面。

## 工程结构

```text
src/api/          Java 与 Agent 接口类型、Axios 和接口方法
src/stores/       Pinia 登录状态
src/router/       页面路由与登录守卫
src/components/   导航、文章卡片、加载状态、安全 Markdown 等
src/composables/  异步加载和保存，忽略过时结果
src/views/        首页、登录注册、阅读、发布、个人主页、资料编辑、智能助手
src/utils/        会话存储、输入校验、日期、Markdown
e2e/              浏览器完整流程测试及模拟 Java API
deploy/           Nginx 配置示例
```

用户名、密码、邮箱等字段校验以 Java DTO 为准。所有 API 保留 `/api` 前缀，分页使用 `pageNumber/pageSize/keyWord`，发布传 `tagsId`，作者列表传 `authorId`。资料加载将 `GET /api/users/{id}` 与 `/api/profile/findProfile` 合并。

## 检查

```powershell
npm run type-check
npm run lint
npm run build
npm run test:e2e
```

Windows 浏览器测试默认使用已安装的 Microsoft Edge。其他平台默认使用 Playwright Chromium：首次运行前执行 `npx playwright install chromium`。Windows 也可使用 `$env:PLAYWRIGHT_CHANNEL='chromium'` 切换到安装好的 Playwright Chromium。

浏览器测试先构建生产版本，在独立的 `5174` 预览端口运行；在 HTTP 边界模拟现有 Java 返回格式，验证前端完整交互，不会改动真实数据库。真实账号、数据库和后端业务规则仍需在实际后台环境联调。页面仅提供本人的删除按钮；服务端的数据归属校验由 Java 后台负责，前端按钮限制不能替代后端授权。

`test-results/` 保存浏览器截图及失败诊断，属于忽略的生成文件。

## 部署

`npm run build` 生成 `dist/`。将目录上传至服务器，参考 `deploy/nginx.conf.example`，配置静态站点和代理：`/api/agent/` 转发到 Agent 的 `127.0.0.1:3002`，其他 `/api/` 请求转发到 Java 的 `127.0.0.1:8080`。生产构建中的请求使用同源相对路径。助手代理读取超时设为 130 秒以覆盖较长的模型调用。SPA history 路由必须回退到 `index.html`，才能直接打开或刷新助手、文章和用户主页。`npm run preview` 用于本地检查构建结果，正式部署由 Nginx 提供 API 代理。

部署子路径时设置 `VITE_BASE_PATH=/realworld/` 并重新构建，同时调整 Nginx 静态目录及回退路径；API 仍使用根路径 `/api`。

## 本次验收（2026-09-30）

49 项单元与组件测试、5 条生产版本浏览器完整流程、严格类型检查、ESLint、生产构建均通过，并完成独立代码审查和桌面/移动截图检查。本机开发页面已确认无浏览器运行错误，开发代理能转发至 Java 8080，并正确收到未登录业务 401；未用真实账号执行数据库写入。

## Agent 接入验收（2026-10-02）

10 项接口与页面状态检查、4 条 Agent 浏览器流程、5 条原有社区浏览器流程、严格类型检查、ESLint 和生产构建通过，并完成独立代码审查及桌面/手机截图检查。覆盖聊天、全部执行阶段、失败重试、清空确认、登录回跳、账号切换和迟到响应。浏览器验证在接口边界使用模拟数据，真实模型调用仍需启动 Agent 后联调。

验证脚本与截图位于已忽略的 `test-results/`，没有新增 `*.test.ts` 文件。截图包含 `agent-desktop-welcome.png`、`agent-desktop-conversation.png`、`agent-mobile-welcome.png`、`agent-mobile-conversation.png`。
