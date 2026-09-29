<template>
  <view class="edit-page safe-page">
    <view v-if="loading" class="state-card">正在加载个人信息…</view>
    <view v-else-if="errorMessage" class="state-card">
      <text>{{ errorMessage }}</text>
      <u-button type="primary" plain shape="circle" @click="loadUser">重新加载</u-button>
    </view>
    <view v-else-if="loaded" class="edit-card">
      <view class="page-title">编辑个人信息</view>
      <view class="page-copy">完善资料，让大家更了解你。</view>
      <u-form :model="form" label-position="top">
        <u-form-item label="用户名" :border-bottom="false">
          <u-input :value="username" disabled border="surround" />
        </u-form-item>
        <view class="field-hint">用户名不可修改</view>
        <u-form-item label="邮箱" :border-bottom="false">
          <u-input v-model="form.email" placeholder="请输入邮箱" maxlength="255" :disabled="submitting" border="surround" />
        </u-form-item>
        <u-form-item label="个人简介" :border-bottom="false">
          <u-textarea v-model="form.bio" placeholder="介绍一下自己（可选）" maxlength="1000" count :disabled="submitting" />
        </u-form-item>
        <u-form-item label="头像地址" :border-bottom="false">
          <u-input v-model="form.image" placeholder="https://…（可选）" maxlength="255" :disabled="submitting" border="surround" />
        </u-form-item>
        <view class="field-hint">填写公开可访问的图片链接，留空使用默认头像。</view>
        <u-form-item label="新密码（选填）" :border-bottom="false">
          <u-input v-model="form.password" type="password" placeholder="留空不修改，6–20 个字符" maxlength="20" :disabled="submitting" border="surround" />
        </u-form-item>
        <u-form-item label="确认新密码" :border-bottom="false">
          <u-input v-model="form.confirmPassword" type="password" placeholder="修改密码时请再次输入" maxlength="20" :disabled="submitting" border="surround" />
        </u-form-item>
      </u-form>
      <view class="save-button">
        <u-button type="primary" shape="circle" :loading="submitting" :disabled="submitting" @click="saveProfile">
          {{ submitting ? '保存中…' : '保存修改' }}
        </u-button>
      </view>
    </view>
  </view>
</template>

<script>
const userApi = require('../../api/user')
const session = require('../../common/session')

export default {
  data() {
    return {
      username: '',
      profile: {},
      form: { email: '', bio: '', image: '', password: '', confirmPassword: '' },
      loading: false,
      loaded: false,
      submitting: false,
      errorMessage: '',
      requestGeneration: 0,
      ownerToken: '',
      ownerId: 0,
    }
  },
  onLoad() {
    return this.loadUser()
  },
  onUnload() {
    this.requestGeneration += 1
    this.clearPassword()
  },
  methods: {
    clearPassword() {
      this.form.password = ''
      this.form.confirmPassword = ''
    },
    isCurrentRequest(generation, token, userId) {
      const user = session.getUser() || {}
      return generation === this.requestGeneration
        && session.getToken() === token
        && Number(user.id) === userId
    },
    async loadUser() {
      if (this.loading || this.submitting) return
      const token = session.getToken()
      const userId = Number((session.getUser() || {}).id) || 0
      if (!token || !userId) {
        uni.reLaunch({ url: '/pages/login/login' })
        return
      }
      const generation = ++this.requestGeneration
      this.ownerToken = token
      this.ownerId = userId
      this.loading = true
      this.loaded = false
      this.errorMessage = ''
      this.clearPassword()
      try {
        const user = await userApi.getUser()
        if (!this.isCurrentRequest(generation, token, userId)) return
        if (!user || Number(user.id) !== userId) throw new Error('个人信息加载异常，请重试')
        this.profile = { ...user }
        this.username = user.username || ''
        this.form = { email: user.email || '', bio: user.bio || '', image: user.image || '', password: '', confirmPassword: '' }
        session.setUser(user)
        this.loaded = true
      } catch (error) {
        if (this.isCurrentRequest(generation, token, userId)) {
          this.errorMessage = (error && error.message) || '个人信息加载失败'
        }
      } finally {
        if (generation === this.requestGeneration) this.loading = false
      }
    },
    validateForm() {
      const email = this.form.email.trim()
      const image = this.form.image.trim()
      const password = this.form.password
      if (!email) return '请输入邮箱'
      if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式错误'
      if (image && (image.length > 255 || !/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(image))) return '请输入有效的 HTTP 或 HTTPS 头像地址'
      if (password && (password.length < 6 || password.length > 20)) return '密码长度应为 6–20 个字符'
      if (password !== this.form.confirmPassword) return '两次输入的密码不一致'
      return ''
    },
    async saveProfile() {
      if (!this.loaded || this.loading || this.submitting) return
      const generation = this.requestGeneration
      const token = this.ownerToken
      const userId = this.ownerId
      if (!this.isCurrentRequest(generation, token, userId)) {
        this.loaded = false
        this.clearPassword()
        uni.reLaunch({ url: '/pages/login/login' })
        return
      }
      const validationMessage = this.validateForm()
      if (validationMessage) {
        uni.showToast({ title: validationMessage, icon: 'none' })
        return
      }
      const changes = {
        email: this.form.email.trim().toLowerCase(),
        bio: this.form.bio.trim(),
        image: this.form.image.trim(),
      }
      const payload = { ...changes }
      if (this.form.password) payload.password = this.form.password
      this.submitting = true
      try {
        await userApi.update(payload)
        if (!this.isCurrentRequest(generation, token, userId)) return
        // 更新接口没有返回用户；只缓存成功保存的资料，不保存密码。
        session.setUser({ ...this.profile, ...changes })
        this.clearPassword()
        uni.showToast({ title: '保存成功', icon: 'success' })
        uni.navigateBack({
          delta: 1,
          fail: () => uni.switchTab({ url: '/pages/my/my' }),
        })
      } catch (error) {
        if (this.isCurrentRequest(generation, token, userId)) {
          uni.showToast({ title: (error && error.message) || '保存失败，请稍后重试', icon: 'none' })
        }
      } finally {
        if (generation === this.requestGeneration) this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.edit-page { min-height: 100vh; box-sizing: border-box; padding: 24rpx; }
.edit-card, .state-card { padding: 36rpx 32rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 10rpx 36rpx rgba(31, 41, 55, 0.06); }
.state-card { display: flex; flex-direction: column; gap: 24rpx; margin-top: 80rpx; color: #909399; text-align: center; }
.page-title { color: #303133; font-size: 38rpx; font-weight: 700; }
.page-copy { margin: 12rpx 0 28rpx; color: #909399; font-size: 25rpx; }
.field-hint { margin: -8rpx 0 16rpx; color: #909399; font-size: 23rpx; line-height: 1.6; }
.save-button { margin-top: 32rpx; }
</style>
