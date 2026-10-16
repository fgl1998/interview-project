package com.example.newbeemallapiv2.util;

import org.springframework.util.StringUtils;

public class ResultGenerator {
    private static final String DEFAULT_SUCCESS_MESSAGE = "SUCCESS";
    private static final String DEFAULT_FAIL_MESSAGE = "FAIL";
    private static final int DEFAULT_SUCCESS_CODE = 200;
    private static final int DEFAULT_ERROR_CODE = 500;

    public static Result genSuccessResult() {
        Result result = new Result();
        result.setResultCode(DEFAULT_SUCCESS_CODE);
        result.setMessage(DEFAULT_SUCCESS_MESSAGE);
        return result;
    }
    public static Result genSuccessResult(String message) {
        Result result = new Result();
        result.setResultCode(DEFAULT_SUCCESS_CODE);
        result.setMessage(message);
        return result;
    }
    public static Result genSuccessResult(Object data) {
        Result result = new Result();
        result.setResultCode(DEFAULT_SUCCESS_CODE);
        result.setMessage(DEFAULT_SUCCESS_MESSAGE);
        result.setData(data);
        return result;
    }
    public static Result genFailResult(String message) {
        Result result = new Result();
        result.setResultCode(DEFAULT_ERROR_CODE);
        if(!StringUtils.hasText(message)){
            result.setMessage(DEFAULT_FAIL_MESSAGE);
        }else{
            result.setMessage(message);
        }
        return result;
    }

    public static Result genErrorResult(int code,String message) {
        Result result = new Result();
        result.setResultCode(code);
        result.setMessage(message);
        return result;
    }
}
