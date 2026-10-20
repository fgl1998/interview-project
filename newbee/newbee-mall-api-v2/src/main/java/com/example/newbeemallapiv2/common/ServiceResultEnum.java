package com.example.newbeemallapiv2.common;

public enum ServiceResultEnum {
    DATA_NOT_EXIST("未查询到记录！"),
    ADMIN_NOT_LOGIN_ERROR("管理员未登录！"),
    ADMIN_TOKEN_EXPIRE_ERROR("管理员登录过期！请重新登录！"),
    LOGIN_ERROR("登录失败！");
    private String result;
    ServiceResultEnum(String result){
        this.result = result;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }
}
