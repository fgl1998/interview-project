<template>
  <view class="my-page safe-page">
    <view v-if="!isLoggedIn" class="guest-card">
      <text class="guest-title">你还没有登录</text>
      <text class="guest-copy">登录后可查看个人资料与管理登录状态。</text>
      <u-button type="primary" shape="circle" @click="goLogin">去登录</u-button>
    </view>

    <template v-else>
      <view class="profile-card">
        <view class="profile-header">
          <view class="avatar">
            <image v-if="userInfo.image && !avatarFailed" class="avatar-image" :src="userInfo.image" mode="aspectFill" @error="avatarFailed = true" />
            <text v-else>{{ avatarText }}</text>
          </view>
          <view class="profile-main">
            <view class="username">{{ userInfo.username || '未设置用户名' }}</view>
            <view class="profile-bio">{{ userInfo.bio || '这个人很低调，还没有填写简介。' }}</view>
            <view v-if="refreshing" class="refreshing">正在同步最新资料…</view>
          </view>
        </view>
        <view class="email">{{ userInfo.email || '未填写邮箱' }}</view>
      </view>

      <view class="stats-card">
        <view class="stat-item" @click="openRelation('following')">
          <text class="stat-value">{{ relationStatsLoading ? '…' : stats.followingCount }}</text>
          <text class="stat-label">我的关注</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item" @click="openRelation('followers')">
          <text class="stat-value">{{ relationStatsLoading ? '…' : stats.followersCount }}</text>
          <text class="stat-label">我的粉丝</text>
        </view>
      </view>
      <view v-if="relationStatsError" class="stats-error" @click="retryRelationStats">
        {{ relationStatsError }}，点击重试
      </view>

      <view class="menu-card">
        <view class="menu-item" @click="openEditProfile">
          <view>
            <view class="menu-title">编辑个人信息</view>
            <view class="menu-copy">修改邮箱、简介、头像和密码</view>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="openArticleList('mine')">
          <view>
            <view class="menu-title">我的文章</view>
            <view class="menu-copy">共 {{ relationStatsLoading ? '…' : stats.articlesCount }} 篇</view>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="openArticleList('favorites')">
          <view>
            <view class="menu-title">收藏的文章</view>
            <view class="menu-copy">共 {{ relationStatsLoading ? '…' : stats.favoritesCount }} 篇</view>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item menu-item--last" @click="openAgent">
          <view>
            <view class="menu-title">智能助手</view>
            <view class="menu-copy">用一句话查找感兴趣的文章</view>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="logout-button">
        <u-button type="warning" plain shape="circle" @click="handleLogout">退出登录</u-button>
      </view>
    </template>
  </view>
</template>

<script>
const userApi = require('../../api/user')
const profileApi = require('../../api/profile')
const articleApi = require('../../api/article')
const session = require('../../common/session')

function emptyStats() {
  return {
    followingCount: '--',
    followersCount: '--',
    articlesCount: '--',
    favoritesCount: '--',
  }
}

export default {
  data() {
    return {
      isLoggedIn: false,
      refreshing: false,
      relationStatsLoading: false,
      relationStatsError: '',
      userInfo: {},
      avatarFailed: false,
      stats: emptyStats(),
      profileRequestGeneration: 0,
      activeSessionToken: '',
      activeSessionUserId: 0,
    }
  },
  computed: {
    avatarText() {
      return (this.userInfo.username || '?').slice(0, 1).toUpperCase()
    },
  },
  onShow() {
    this.restoreAndRefresh()
  },
  methods: {
    async restoreAndRefresh() {
      const generation = ++this.profileRequestGeneration
      const cached = session.get()
      const cachedUserId = Number(cached.user && cached.user.id) || 0
      const sessionChanged = cached.token !== this.activeSessionToken
        || cachedUserId !== this.activeSessionUserId
      this.activeSessionToken = cached.token
      this.activeSessionUserId = cachedUserId
      this.isLoggedIn = Boolean(cached.token)
      this.userInfo = cached.user || {}
      this.avatarFailed = false

      if (sessionChanged) {
        this.stats = emptyStats()
        this.relationStatsError = ''
        this.relationStatsLoading = Boolean(cached.token)
      }

      if (!cached.token) {
        this.refreshing = false
        this.relationStatsLoading = false
        return
      }
      const requestToken = cached.token
      this.refreshing = true
      try {
        const user = await userApi.getUser()
        if (generation !== this.profileRequestGeneration || session.getToken() !== requestToken) return
        this.userInfo = user || {}
        this.avatarFailed = false
        this.activeSessionUserId = Number(this.userInfo.id) || 0
        session.setUser(this.userInfo)
        await this.refreshRelationStats(this.userInfo.id, generation, requestToken)
      } catch (error) {
        if (generation === this.profileRequestGeneration && session.getToken() === requestToken) {
          uni.showToast({
            title: (error && error.message) || '个人资料刷新失败',
            icon: 'none',
          })
          if (sessionChanged) {
            this.relationStatsLoading = false
            this.relationStatsError = '用户中心数据暂时不可用'
          }
        }
      } finally {
        if (generation === this.profileRequestGeneration) {
          this.refreshing = false
          this.isLoggedIn = Boolean(session.getToken())
        }
      }
    },
    async refreshRelationStats(userId, generation, requestToken) {
      if (!userId) return
      this.relationStatsLoading = true
      this.relationStatsError = ''
      try {
        const [followingUsers, followerUsers, articles, favoriteArticles] = await Promise.all([
          profileApi.followingList(userId),
          profileApi.followedList(userId),
          articleApi.getArticleListByUserId(userId),
          articleApi.getFavoriteArticleListByUserId(userId),
        ])
        if (generation !== this.profileRequestGeneration || session.getToken() !== requestToken) return
        this.stats = {
          ...this.stats,
          followingCount: Array.isArray(followingUsers) ? followingUsers.length : 0,
          followersCount: Array.isArray(followerUsers) ? followerUsers.length : 0,
          articlesCount: Array.isArray(articles) ? articles.length : 0,
          favoritesCount: Array.isArray(favoriteArticles) ? favoriteArticles.length : 0,
        }
      } catch (error) {
        if (generation === this.profileRequestGeneration && session.getToken() === requestToken) {
          this.relationStatsError = (error && error.message) || '用户中心数据加载失败'
        }
      } finally {
        if (generation === this.profileRequestGeneration && session.getToken() === requestToken) {
          this.relationStatsLoading = false
        }
      }
    },
    retryRelationStats() {
      return this.refreshRelationStats(
        this.userInfo.id,
        this.profileRequestGeneration,
        session.getToken(),
      )
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' })
    },
    openEditProfile() {
      uni.navigateTo({ url: '/pages/my/edit' })
    },
    openAgent() {
      uni.navigateTo({ url: '/pages/agent/chat' })
    },
    openRelation(type) {
      const url = type === 'followers'
        ? '/pages/profile/relation?type=followers'
        : '/pages/profile/relation?type=following'
      uni.navigateTo({ url })
    },
    openArticleList(type) {
      const url = type === 'favorites'
        ? '/pages/article/list?type=favorites'
        : '/pages/article/list?type=mine'
      uni.navigateTo({ url })
    },
    handleLogout() {
      this.profileRequestGeneration += 1
      session.clear()
      this.isLoggedIn = false
      this.refreshing = false
      this.relationStatsLoading = false
      this.relationStatsError = ''
      this.userInfo = {}
      this.stats = emptyStats()
      this.activeSessionToken = ''
      this.activeSessionUserId = 0
      uni.reLaunch({ url: '/pages/login/login' })
    },
  },
}
</script>

<style lang="scss" scoped>
.my-page { min-height: 100vh; box-sizing: border-box; padding: 32rpx 24rpx 48rpx; }
.guest-card, .profile-card, .stats-card, .menu-card { background: #fff; border-radius: 24rpx; box-shadow: 0 10rpx 36rpx rgba(31, 41, 55, 0.06); }
.guest-card { display: flex; flex-direction: column; align-items: center; margin-top: 100rpx; padding: 64rpx 40rpx; text-align: center; }
.guest-title { color: #303133; font-size: 36rpx; font-weight: 600; }
.guest-copy { margin: 18rpx 0 40rpx; color: #909399; font-size: 27rpx; line-height: 1.7; }
.profile-card { padding: 36rpx 32rpx; }
.profile-header { display: flex; align-items: center; }
.avatar { display: flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 104rpx; height: 104rpx; margin-right: 24rpx; color: #fff; font-size: 42rpx; font-weight: 700; background: linear-gradient(135deg, #3c9cff, #7a74ff); border-radius: 50%; }
.avatar-image { width: 100%; height: 100%; border-radius: 50%; }
.profile-main { min-width: 0; }
.username { color: #303133; font-size: 38rpx; font-weight: 650; }
.profile-bio { overflow: hidden; margin-top: 9rpx; color: #606266; font-size: 25rpx; text-overflow: ellipsis; white-space: nowrap; }
.refreshing { margin-top: 8rpx; color: #909399; font-size: 22rpx; }
.email { margin-top: 28rpx; padding-top: 24rpx; color: #909399; font-size: 25rpx; border-top: 1rpx solid #ebeef5; }
.stats-card { display: flex; align-items: center; margin-top: 24rpx; padding: 28rpx 0; }
.stats-error { margin: 14rpx 12rpx 0; color: #f56c6c; font-size: 22rpx; text-align: center; }
.stat-item { display: flex; flex: 1; flex-direction: column; align-items: center; }
.stat-value { color: #303133; font-size: 36rpx; font-weight: 700; }
.stat-label { margin-top: 7rpx; color: #909399; font-size: 24rpx; }
.stat-divider { width: 1rpx; height: 58rpx; background: #ebeef5; }
.menu-card { margin-top: 24rpx; padding: 0 32rpx; }
.menu-item { display: flex; align-items: center; justify-content: space-between; padding: 30rpx 0; border-bottom: 1rpx solid #ebeef5; }
.menu-item--last { border-bottom: 0; }
.menu-title { color: #303133; font-size: 29rpx; font-weight: 600; }
.menu-copy { margin-top: 7rpx; color: #909399; font-size: 23rpx; }
.menu-arrow { color: #c0c4cc; font-size: 48rpx; line-height: 1; }
.logout-button { margin-top: 36rpx; }
</style>
