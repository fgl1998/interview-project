package com.example.newbeemallapiv2.dao;

import com.example.newbeemallapiv2.entity.AdminUserToken;

public interface AdminUserTokenMapper {
    int deleteByPrimaryKey(Long adminUserId);

    int insert(AdminUserToken row);

    int insertSelective(AdminUserToken row);

    AdminUserToken selectByPrimaryKey(Long adminUserId);

    int updateByPrimaryKeySelective(AdminUserToken row);

    int updateByPrimaryKey(AdminUserToken row);

    AdminUserToken selectByToken(String token);
}