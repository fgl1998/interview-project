package com.example.newbeemallapiv2.util;

import com.example.newbeemallapiv2.common.NewBeeMallException;
import com.example.newbeemallapiv2.common.ServiceResultEnum;
import com.example.newbeemallapiv2.dao.AdminUserTokenMapper;
import com.example.newbeemallapiv2.entity.AdminUserToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class AdminUserInfoByToken {
    @Autowired
    private  AdminUserTokenMapper adminUserTokenMapper;
    public AdminUserToken getAdminUserToken(String token) {
        if(token!=null&&!"".equals(token)){
            AdminUserToken adminUserToken= adminUserTokenMapper.selectByToken(token);
            if(adminUserToken==null){
                NewBeeMallException.fail(ServiceResultEnum.ADMIN_NOT_LOGIN_ERROR.getResult());
            } else if (adminUserToken.getExpireTime().getTime()<=System.currentTimeMillis()) {
                NewBeeMallException.fail(ServiceResultEnum.ADMIN_TOKEN_EXPIRE_ERROR.getResult());
            }else{
                return adminUserToken;
            }
        }else{
            NewBeeMallException.fail(ServiceResultEnum.ADMIN_NOT_LOGIN_ERROR.getResult());
        }
        return null;
    }
}
