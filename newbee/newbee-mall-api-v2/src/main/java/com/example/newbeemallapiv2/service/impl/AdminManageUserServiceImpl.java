package com.example.newbeemallapiv2.service.impl;

import com.example.newbeemallapiv2.dao.AdminUserMapper;
import com.example.newbeemallapiv2.entity.AdminUser;
import com.example.newbeemallapiv2.service.AdminManageUserService;
import org.springframework.stereotype.Service;

@Service
public class AdminManageUserServiceImpl implements AdminManageUserService {
    private AdminUserMapper adminUserMapper;

    public AdminManageUserServiceImpl(AdminUserMapper adminUserMapper) {
        this.adminUserMapper = adminUserMapper;
    }

    @Override
    public String login(String username, String password){
        AdminUser adminUser = adminUserMapper.login(username, password);
        if(adminUser != null){

        }
        return "dwdsdsds";
    }
}
