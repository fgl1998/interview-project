const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

const pageFiles = [
  'pages/agent/chat.vue',
  'pages/login/login.vue',
  'pages/register/register.vue',
  'pages/index/index.vue',
  'pages/article/create.vue',
  'pages/article/detail.vue',
  'pages/article/list.vue',
  'pages/profile/relation.vue',
  'pages/profile/detail.vue',
  'pages/my/my.vue',
  'pages/my/edit.vue',
]

test('page scripts are valid JavaScript and all relative requires resolve', () => {
  for (const relativePath of pageFiles) {
    const source = read(relativePath)
    const script = source.match(/<script>([\s\S]*?)<\/script>/)
    assert.ok(script, `${relativePath} should contain a script block`)
    assert.doesNotThrow(() => new Function(script[1].replace(/export\s+default/, 'return')))

    for (const match of script[1].matchAll(/require\(['"](\.{1,2}\/[^'"]+)['"]\)/g)) {
      const requestPath = path.resolve(root, path.dirname(relativePath), match[1])
      const candidates = [requestPath, `${requestPath}.js`, path.join(requestPath, 'index.js')]
      assert.ok(candidates.some(fs.existsSync), `${relativePath}: ${match[1]} should resolve`)
    }
  }
})

test('login page uses the reviewed user API and session contract', () => {
  const source = read('pages/login/login.vue')

  assert.match(source, /form:\s*\{\s*username:/)
  assert.match(source, /password:/)
  assert.match(source, /userApi\.login\(/)
  assert.match(source, /session\.set\(\{\s*token:\s*result\.token,\s*user:\s*result\.user/)
  assert.match(source, /uni\.switchTab\(\{\s*url:\s*['"]\/pages\/index\/index['"]/)
  assert.match(source, /pages\/register\/register/)
})

test('registration page creates an account and returns to login without signing in', () => {
  const source = read('pages/register/register.vue')

  assert.match(source, /form:\s*\{\s*username:/)
  assert.match(source, /email:/)
  assert.match(source, /confirmPassword:/)
  assert.match(source, /userApi\.register\(username, email, password\)/)
  assert.match(source, /注册成功，请登录/)
  assert.match(source, /uni\.navigateBack\(/)
  assert.doesNotMatch(source, /userApi\.login\(/)
  assert.doesNotMatch(source, /session\.set\(/)
})

test('home page implements authenticated paginated article loading', () => {
  const source = read('pages/index/index.vue')

  assert.match(source, /pageSize:\s*10/)
  assert.match(source, /articleApi\.list\(\{\s*page:\s*targetPage,\s*pageSize:\s*this\.pageSize/)
  assert.match(source, /normalizeArticle/)
  assert.match(source, /onPullDownRefresh\s*\(/)
  assert.match(source, /uni\.stopPullDownRefresh\(\)/)
  assert.match(source, /onReachBottom\s*\(/)
  assert.match(source, /encodeURIComponent\(article\.slug\)/)
  assert.match(source, /class="footer-error" @click="retryLoad"/)
})

test('article detail page loads detail and comments and mutates by IDs', () => {
  const source = read('pages/article/detail.vue')

  assert.match(source, /decodeURIComponent\(options\.slug/)
  assert.match(source, /articleApi\.detail\(this\.slug\)/)
  assert.match(source, /articleApi\.listComments\(this\.article\.id\)/)
  assert.match(source, /articleApi\.(?:favorite|unfavorite)\(this\.article\.id\)/)
  assert.match(source, /articleApi\.createComment\(this\.article\.id,\s*this\.commentBody/)
  assert.match(source, /articleApi\.deleteComment\(comment\.id\)/)
  assert.match(source, /comment\.author\.id\s*===\s*this\.currentUser\.id/)
})

test('article creation page loads tags and posts the current backend contract', () => {
  const source = read('pages/article/create.vue')
  const home = read('pages/index/index.vue')

  assert.match(source, /tagApi\.list\(\)/)
  assert.match(source, /articleApi\.create\(/)
  assert.match(source, /tagsId:\s*this\.selectedTagIds/)
  assert.match(source, /pages\/article\/list\?type=mine/)
  assert.match(home, /pages\/article\/create/)
})

test('my page restores and refreshes the reviewed session user', () => {
  const source = read('pages/my/my.vue')

  assert.match(source, /session\.get\(\)/)
  assert.match(source, /userApi\.getUser\(\)/)
  assert.match(source, /profileApi\.followingList\(/)
  assert.match(source, /profileApi\.followedList\(/)
  assert.match(source, /articleApi\.getArticleListByUserId\(/)
  assert.match(source, /articleApi\.getFavoriteArticleListByUserId\(/)
  assert.match(source, /session\.setUser\(/)
  assert.match(source, /session\.clear\(\)/)
  assert.match(source, /uni\.reLaunch\(\{\s*url:\s*['"]\/pages\/login\/login['"]/)
  assert.match(source, /pages\/profile\/relation\?type=following/)
  assert.match(source, /pages\/profile\/relation\?type=followers/)
  assert.match(source, /pages\/article\/list\?type=mine/)
  assert.match(source, /pages\/article\/list\?type=favorites/)
})

test('relation and article list pages use real APIs selected by query type', () => {
  const relation = read('pages/profile/relation.vue')
  const articles = read('pages/article/list.vue')

  assert.match(relation, /profileApi\.(?:followedList|followingList)/)
  assert.match(relation, /session\.getUser\(\)/)
  assert.match(relation, /options\.userId/)
  assert.match(relation, /pages\/profile\/detail\?username=/)
  assert.match(articles, /articleApi\.getFavoriteArticleListByUserId\(/)
  assert.match(articles, /articleApi\.getArticleListByUserId\(/)
  assert.match(articles, /options\.userId/)
  assert.match(articles, /normalizeArticle/)
  assert.match(articles, /v-if=["']canDelete["']/)
  assert.match(articles, /@click\.stop=["']confirmDelete\(article\)["']/)
  assert.match(articles, /articleApi\.deleteArticle\(article\.id\)/)
})

test('article author avatars navigate to the author profile page', () => {
  const home = read('pages/index/index.vue')
  const detail = read('pages/article/detail.vue')
  const profile = read('pages/profile/detail.vue')

  assert.match(home, /@click\.stop=["']openAuthor\(article\.author\)["']/)
  assert.match(detail, /@click=["']openAuthor\(article\.author\)["']/)
  assert.match(home, /pages\/profile\/detail\?username=/)
  assert.match(detail, /pages\/profile\/detail\?username=/)
  assert.match(profile, /profileApi\.get\(this\.username\)/)
  assert.match(profile, /profileApi\.(?:follow|unfollow)\(this\.profile\.id\)/)
  assert.match(profile, /articleApi\.getArticleListByUserId\(this\.profile\.id\)/)
  assert.match(profile, /@click=["']openRelation\('following'\)["']/)
  assert.match(profile, /@click=["']openRelation\('followers'\)["']/)
  assert.match(profile, /@click=["']openArticles["']/)
  assert.match(profile, /this\.isSelf\s*=\s*Number\(currentUser\.id\)/)
  assert.match(profile, /v-if=["']!isSelf["']/)
})

test('page configuration registers detail and home refresh support', () => {
  const pages = JSON.parse(read('pages.json').replace(/\/\/.*$/gm, ''))
  const home = pages.pages.find((page) => page.path === 'pages/index/index')
  const detail = pages.pages.find((page) => page.path === 'pages/article/detail')
  const create = pages.pages.find((page) => page.path === 'pages/article/create')
  const relation = pages.pages.find((page) => page.path === 'pages/profile/relation')
  const articleList = pages.pages.find((page) => page.path === 'pages/article/list')
  const profile = pages.pages.find((page) => page.path === 'pages/profile/detail')
  const register = pages.pages.find((page) => page.path === 'pages/register/register')

  assert.ok(detail)
  assert.ok(create)
  assert.ok(relation)
  assert.ok(articleList)
  assert.ok(profile)
  assert.ok(register)
  assert.equal(register.style.navigationBarTitleText, '注册')
  assert.equal(home.style.enablePullDownRefresh, true)
  assert.equal(home.style.navigationBarTitleText, '文章')
  assert.equal(detail.style.navigationBarTitleText, '文章详情')
  assert.equal(create.style.navigationBarTitleText, '发布文章')
  assert.equal(articleList.style.enablePullDownRefresh, true)
})

test('mini-program build uses a simple list key and transpiles uView', () => {
  const home = read('pages/index/index.vue')
  const vueConfig = read('vue.config.js')

  assert.match(home, /:key=["']article\.slug["']/)
  assert.doesNotMatch(home, /:key=["'][^"']*\|\|[^"']*["']/)
  assert.match(vueConfig, /transpileDependencies/)
  assert.match(vueConfig, /uview-ui/)
})
