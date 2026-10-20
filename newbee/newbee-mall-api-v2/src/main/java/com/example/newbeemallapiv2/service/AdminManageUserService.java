package com.example.newbeemallapiv2.service;

import com.example.newbeemallapiv2.entity.AdminUser;

public interface AdminManageUserService {
    /**
     * 管登录
     * @param username
     * @param password
     * @return
     */
    String login(String username, String password);

    /**
     * 获取用户详细信息
     * @param loginUserId
     * @return
     */
    AdminUser getUserDetailById(Long loginUserId);
}
