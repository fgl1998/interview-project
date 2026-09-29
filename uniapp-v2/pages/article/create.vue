<template>
  <view class="create-page safe-page">
    <view class="editor-card">
      <view class="page-title">发布新文章</view>
      <view class="page-copy">填写内容后，文章会立即发布到社区。</view>

      <u-form :model="form" label-position="top">
        <u-form-item label="标题" :border-bottom="false">
          <u-input
            v-model="form.title"
            placeholder="请输入文章标题"
            maxlength="100"
            :disabled="submitting"
            border="surround"
          />
        </u-form-item>
        <u-form-item label="摘要" :border-bottom="false">
          <u-textarea
            v-model="form.description"
            placeholder="用一两句话介绍文章内容"
            maxlength="255"
            count
            :disabled="submitting"
          />
        </u-form-item>
        <u-form-item label="正文" :border-bottom="false">
          <u-textarea
            v-model="form.body"
            placeholder="请输入文章正文"
            maxlength="10000"
            count
            :height="320"
            :disabled="submitting"
          />
        </u-form-item>
      </u-form>

      <view class="tag-section">
        <view class="field-label">标签（至少选择一个）</view>
        <view v-if="tagsLoading" class="tag-state">正在加载标签…</view>
        <view v-else-if="tags.length" class="tag-options">
          <view
            v-for="tag in tags"
            :key="tag.id"
            class="tag-option"
            :class="{ 'tag-option--selected': isTagSelected(tag.id) }"
            @click="toggleTag(tag.id)"
          >
            {{ tag.name }}
          </view>
        </view>
        <view v-else class="tag-state" @click="loadTags">暂无可选标签，请添加标签后点击重试。</view>
      </view>

      <u-button
        type="primary"
        shape="circle"
        :loading="submitting"
        :disabled="submitting || tagsLoading || !selectedTagIds.length"
        @click="submitArticle"
      >
        {{ submitting ? '发布中…' : '发布文章' }}
      </u-button>
    </view>
  </view>
</template>

<script>
const articleApi = require('../../api/article')
const tagApi = require('../../api/tag')
const session = require('../../common/session')

export default {
  data() {
    return {
      form: {
        title: '',
        description: '',
        body: '',
      },
      tags: [],
      selectedTagIds: [],
      tagsLoading: false,
      submitting: false,
    }
  },
  onLoad() {
    if (!session.getToken()) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.loadTags()
  },
  methods: {
    showError(message) {
      uni.showToast({ title: message, icon: 'none' })
    },
    async loadTags() {
      if (this.tagsLoading) return
      this.tagsLoading = true
      try {
        const result = await tagApi.list()
        this.tags = (Array.isArray(result) ? result : []).filter((tag) => tag && tag.id)
      } catch (error) {
        this.showError((error && error.message) || '标签加载失败')
      } finally {
        this.tagsLoading = false
      }
    },
    isTagSelected(tagId) {
      return this.selectedTagIds.includes(tagId)
    },
    toggleTag(tagId) {
      if (this.submitting) return
      const index = this.selectedTagIds.indexOf(tagId)
      if (index >= 0) {
        this.selectedTagIds.splice(index, 1)
      } else {
        this.selectedTagIds.push(tagId)
      }
    },
    validateForm() {
      const title = this.form.title.trim()
      const description = this.form.description.trim()
      const body = this.form.body.trim()
      if (!title) return '请输入文章标题'
      if (title.length > 100) return '标题不能超过 100 个字符'
      if (!description) return '请输入文章摘要'
      if (description.length > 255) return '摘要不能超过 255 个字符'
      if (!body) return '请输入文章正文'
      if (!this.selectedTagIds.length) return '请至少选择一个标签'
      return ''
    },
    async submitArticle() {
      if (this.submitting) return
      const validationMessage = this.validateForm()
      if (validationMessage) {
        this.showError(validationMessage)
        return
      }

      this.submitting = true
      try {
        await articleApi.create({
          title: this.form.title.trim(),
          description: this.form.description.trim(),
          body: this.form.body.trim(),
          tagsId: this.selectedTagIds,
        })
        uni.showToast({ title: '发布成功', icon: 'success' })
        // Java 创建接口返回文章 ID；从我的文章列表可继续查看详情。
        uni.redirectTo({
          url: '/pages/article/list?type=mine',
        })
      } catch (error) {
        this.showError((error && error.message) || '文章发布失败')
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.create-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24rpx;
}

.editor-card {
  padding: 36rpx 32rpx 44rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 10rpx 36rpx rgba(31, 41, 55, 0.06);
}

.page-title { color: #303133; font-size: 40rpx; font-weight: 700; }
.page-copy { margin: 12rpx 0 30rpx; color: #909399; font-size: 25rpx; line-height: 1.6; }
.tag-section { margin: 4rpx 0 42rpx; }
.field-label { margin-bottom: 18rpx; color: #303133; font-size: 28rpx; }
.tag-options { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tag-option { padding: 12rpx 22rpx; color: #606266; font-size: 25rpx; background: #f4f4f5; border: 1rpx solid #ebeef5; border-radius: 999rpx; }
.tag-option--selected { color: #fff; background: #3c9cff; border-color: #3c9cff; }
.tag-state { color: #909399; font-size: 25rpx; }
</style>
