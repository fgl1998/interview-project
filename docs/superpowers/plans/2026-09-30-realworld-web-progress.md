# 进度：2026-09-30-realworld-web.md

- Task 1: complete — 新工程、实际 Java 类型和 API、Axios 业务码与旧 Token 保护、Pinia 持久化、校验和 Markdown。
- Task 2: complete — 实际公共布局、登录注册、资料页、只读用户名、失败重试与资料同步。
- Task 3: complete — 搜索分页、文章、收藏评论、发布预览、作者文章、收藏、关注与粉丝列表。
- Task 4: complete — 生产构建、type-check 和 ESLint 已通过，49 项单元组件测试、5 条生产版本 Playwright 完整流程全部通过（退出码 0），桌面和移动截图已查看，独立审查无剩余重要问题。

独立审查 `review_web` 已发现并已修复：登录 setSession 导致 App key 重建登录页而无法跳转；旧登录请求先完成可覆盖新登录。新增实际 App 布局测试和延迟登录/卸载测试先失败后通过。前端 AuthView 卸载取消登录尝试、每次登录递增版本、只有当前登录结果才跳转。

Ruling: 用户明确要求开始开发，因此在当前授权工作区创建独立目录，直接实施已确认技术方案，不重复要求设计文档审批，也不自动提交或创建分支。
Ruling: Java 没有文章更新/标签筛选，不展示不存在的功能；独立 Agent 不迁移。
Ruling: Playwright 使用生产构建预览 5174，避免开发端按需依赖优化造成首访路由 504，并验证最终构建。Vite 开发端口仍为 5173，缓存按 mode 隔离。

本机实际 Java `GET http://127.0.0.1:8080/api/hello` 响应成功；未使用真实用户账号执行数据库写入。端到端使用独立模拟 API。

独立审查另外发现登录错误套用注册密码长度限制，已按实际 LoginRequest 修复并加入回归：登录密码仅检查非空，注册和新密码仍为6–20。共三项发现已全部复审通过。

浏览器验证在生产 preview 5174 完成；Windows 沙箱无法自动结束测试的预览子进程，已核实 PID 90636 与本项目路径后结束该 helper，Playwright 正常返回 `5 passed`、exit 0。保留本项目 5173 开发服务（核实 PID 81960）。

最终实际浏览器探测 `http://127.0.0.1:5173/`：标题正确、登录引导可见、运行错误为空。实际开发代理 POST `/api/articles/queryArticles`：HTTP 200、Java business code401、success false，证明已连接当前 Java 后台。

交付：README、锁文件、环境示例、生产 Nginx 示例已完成。没有提交、推送或修改同级 Java/uni-app 业务代码。原有 `uniapp-v2/docs/backend-user-center-apis.md` 和 `.claude/` 改动保留。
