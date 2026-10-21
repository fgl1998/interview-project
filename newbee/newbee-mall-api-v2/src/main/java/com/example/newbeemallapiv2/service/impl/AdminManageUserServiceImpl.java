package com.example.newbeemallapiv2.service.impl;

import com.example.newbeemallapiv2.common.ServiceResultEnum;
import com.example.newbeemallapiv2.dao.AdminUserMapper;
import com.example.newbeemallapiv2.dao.AdminUserTokenMapper;
import com.example.newbeemallapiv2.entity.AdminUser;
import com.example.newbeemallapiv2.entity.AdminUserToken;
import com.example.newbeemallapiv2.service.AdminManageUserService;
import com.example.newbeemallapiv2.util.NumberUtil;
import com.example.newbeemallapiv2.util.SystemUtil;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class AdminManageUserServiceImpl implements AdminManageUserService {
    private AdminUserMapper adminUserMapper;
    private AdminUserTokenMapper adminUserTokenMapper;

    public AdminManageUserServiceImpl(AdminUserMapper adminUserMapper, AdminUserTokenMapper adminUserTokenMapper) {

        this.adminUserMapper = adminUserMapper;
        this.adminUserTokenMapper = adminUserTokenMapper;
    }

    private String getNewToken(String timeStr, Long userId) {
        String src = timeStr + userId + NumberUtil.genRandomNum(6);
        return SystemUtil.genToken(src);
    }

    @Override
    public String login(String username, String password) {
        AdminUser adminUser = adminUserMapper.login(username, password);
        if (adminUser != null) {
            String token=getNewToken(System.currentTimeMillis()+"",adminUser.getAdminUserId());
            AdminUserToken adminUserToken= adminUserTokenMapper.selectByPrimaryKey(adminUser.getAdminUserId());
            Date now=new Date();
            Date expireTime=new Date(now.getTime()+1000*60*2);
            if(adminUserToken == null){
                adminUserToken=new AdminUserToken();
                adminUserToken.setAdminUserId(adminUser.getAdminUserId());
                adminUserToken.setToken(token);
                adminUserToken.setExpireTime(expireTime);
                adminUserToken.setUpdateTime(now);
                if(adminUserTokenMapper.insertSelective(adminUserToken)>0){
                    return token;
                }
            }else{
                adminUserToken.setUpdateTime(now);
                adminUserToken.setToken(token);
                adminUserToken.setExpireTime(expireTime);
                if(adminUserTokenMapper.updateByPrimaryKeySelective(adminUserToken)>0){
                    return token;
                }
            }


        }
        return ServiceResultEnum.LOGIN_ERROR.getResult();
    }

    @Override
    public AdminUser getUserDetailById(Long loginUserId){
        return adminUserMapper.selectByPrimaryKey(loginUserId);
    }

    @Override
    public Boolean logout(Long loginUserId){
        return adminUserTokenMapper.deleteByPrimaryKey(loginUserId)>0;
    }
}
