package com.example.newbeemallapiv2.api.admin.param;

import jakarta.validation.constraints.NotEmpty;

public class AdminLoginParam {
    @NotEmpty(message = "用户名不能为空")
    private String userName;

    @NotEmpty(message = "密码不能为空")
    private String passwordMd5;

    public String getUserName() {
        return userName;
    }
    public void setUserName(String userName) {
        this.userName = userName;
    }
    public String getPasswordMd5() {
        return passwordMd5;
    }
    public void setPasswordMd5(String passwordMd5) {
        this.passwordMd5 = passwordMd5;
    }
}
