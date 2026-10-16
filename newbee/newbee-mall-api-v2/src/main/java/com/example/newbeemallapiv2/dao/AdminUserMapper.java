package com.example.newbeemallapiv2.dao;

import com.example.newbeemallapiv2.entity.AdminUser;
import org.apache.ibatis.annotations.Param;

public interface AdminUserMapper {
    int deleteByPrimaryKey(Long adminUserId);

    int insert(AdminUser row);

    int insertSelective(AdminUser row);

    AdminUser selectByPrimaryKey(Long adminUserId);

    int updateByPrimaryKeySelective(AdminUser row);

    int updateByPrimaryKey(AdminUser row);

    AdminUser login(@Param("username") String username, @Param("password") String password);
}