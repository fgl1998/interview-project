const http = require('../common/http')
const session = require('../common/session')

function createProfileApi(client, sessionStore = session) {
  const request = client.request
  function currentUserId() {
    const user = sessionStore.getUser()
    if (!user || !user.id) throw new Error('登录信息不完整，请重新登录')
    return user.id
  }

  return {
    followingList(userId) {
      return request('/api/profile/followingList', { userId })
    },
    followedList(userId) {
      return request('/api/profile/followerList', { userId })
    },
    get(username) {
      return request('/api/profile/findProfile', { username, userId: currentUserId() })
    },
    follow(followingId) {
      return request('/api/profile/follow', { followingId, userId: currentUserId() })
    },
    unfollow(followingId) {
      return request('/api/profile/unfollow', { followingId, userId: currentUserId() })
    },
  }
}

const profileApi = createProfileApi(http)

module.exports = {
  createProfileApi,
  ...profileApi,
}
