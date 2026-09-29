# Java RealWorld 接口联调

当前 `uniapp-v2` 对接同级目录 `RealWorld`（Spring Boot），业务地址在 `config/env.js` 的 `SERVER_BASE_URL` 中配置，默认 `http://127.0.0.1:8080`。

## 启动与地址

1. 启动 `RealWorld`，保证 MySQL、JWT 等配置可用。
2. 在 HBuilderX 打开 `uniapp-v2`，运行到微信开发者工具或浏览器。
3. 切换后重新登录。原 Express Token 不应继续使用；Java 认证失败返回业务码 401，前端会清除会话并跳到登录页。
4. 小程序/App 真机运行时，将 `SERVER_BASE_URL` 的 `127.0.0.1` 改成开发机局域网 IP，保留 Java 实际端口。小程序正式发布需配置 HTTPS 合法域名。

H5 使用同源 `/api` 请求。开发时 `vue.config.js` 将 `/api` 代理到 `SERVER_BASE_URL`，避免 Java 未配置 CORS 导致浏览器请求失败。发布 H5 后，Web 服务器也需要将 `/api` 反向代理到 Java 服务；更换代理目标后重启前端开发服务。

## 响应与认证

业务接口统一返回 `{ code, message, data, success }`，成功 `code: 200`。Java 的业务错误通常仍是 HTTP 200，以 `success: false` 和 `code` 判断。请求层同时支持 HTTP 401 和业务码 401，并防止旧请求清除新登录的会话。

除注册、登录等公开接口外，请求携带 `Authorization: Bearer <token>`。

## 接口对应

下列接口除明确标注外均为 POST。

| 功能 | Java 路径 | 请求参数 / 返回 data |
| --- | --- | --- |
| 注册 | `/api/users/register` | `{ username, email, password }`，返回用户 |
| 登录 | `/api/users/login` | `{ username, password }`，返回 `{ token, user }` |
| 用户信息 | `GET /api/users/{id}` | 返回 `{ id, username, email }` |
| 更新个人信息 | `/api/users/update` | `{ id, email, bio, image, password? }`；id 来自当前会话，不传 username，密码留空时省略 password |
| 作者资料 | `/api/profile/findProfile` | `{ username, userId }`，userId 是当前登录用户，用于计算关注状态 |
| 关注 / 取消关注 | `/api/profile/follow`、`/api/profile/unfollow` | `{ followingId, userId }` |
| 关注 / 粉丝列表 | `/api/profile/followingList`、`/api/profile/followerList` | `{ userId }`，此处 userId 是要查看的用户 |
| 首页分页 | `/api/articles/queryArticles` | `{ pageNumber, pageSize, keyWord }`，返回 `{ list, total, pageNumber, pageSize, totalPages }` |
| 文章详情 | `/api/articles/getArticleDetailBySlug` | `{ slug }` |
| 创建文章 | `/api/articles/create` | `{ title, description, body, tagsId: [1, 2] }`，返回文章 ID |
| 作者文章 | `/api/articles/queryArticlesByAuthorId` | `{ authorId }`，必填且大于 0；查询自己时也显式传当前用户 ID |
| 我的收藏 | `/api/articles/queryArticlesByFavoriteUser` | `{}`，用户身份来自 JWT |
| 删除文章 | `/api/articles/deleteArticle` | `{ articleId }` |
| 收藏 / 取消收藏 | `/api/articles/favorite`、`/api/articles/unfavorite` | `{ articleId }` |
| 查询评论 | `/api/articles/comment/queryComments` | `{ articleId }` |
| 创建评论 | `/api/articles/comment/create` | `{ articleId, body }` |
| 删除评论 | `/api/articles/comment/delete` | `{ commentId }` |
| 标签列表 | `/api/tags/list` | `{}`，返回 `[{ id, name }]` |

前端 API 层将分页 `list` 转成页面使用的 `items`。用户中心通过用户查询和作者资料查询补全简介、头像。文章和评论的 `authorId`、`authorUsername` 等扁平字段由 `common/article.js` 归一化。

发布文章至少选择一个标签，摘要最多 255 字符。创建成功后打开“我的文章”列表，因为 Java 创建接口只返回 ID，不返回 slug。没有标签时需要先在后台准备标签数据，再点击标签区重试加载。

Java 作者查询接口只按请求中的 `authorId` 筛选文章，不再默认查询当前用户。前端查询自己时传 `{ authorId: 当前用户的userId }`，查询他人时传目标作者 ID。JWT 当前用户只用于计算 `favorited`，查询结果按创建时间、ID 倒序排列。其他作者主页、文章数量和列表入口均保留。收藏列表只支持当前用户，不支持查询他人收藏。

## 独立 Agent 服务

“我的 → 编辑个人信息”可修改邮箱、简介、头像地址和密码。用户名只读。进入编辑页先加载最新资料，保存成功后更新本地缓存并返回；新密码留空则保持原密码，密码不会写入本地缓存。头像当前使用公开图片 URL，不涉及文件上传。

`AGENT_BASE_URL` 仍指向独立 Agent 服务（默认 3002），Java `RealWorld` 没有 `/api/agent/*` 接口。本次未迁移 Agent 服务：它的 JWT 验证及内部 RealWorld 调用仍需另行对齐 Java，不能仅把 Agent 地址改为 8080。业务接口迁移完成不代表智能助手已完成联调。

## 验证

在仓库根目录运行 `node --test uniapp-v2/tests/*.test.js`。在 `RealWorld` 目录运行 `mvn test`（或项目 Maven Wrapper）。新增 Java 测试覆盖指定作者、显式查询当前用户、缺失或非法作者 ID，以及查询中浏览者与作者参数的区分，不依赖数据库数据。

文章列表、详情、作者文章和收藏列表均批量补充 `tags` 标签名称数组，保留原有标签展示。没有关联标签时返回空数组。文件上传当前没有前端入口，本次未新增上传功能。
