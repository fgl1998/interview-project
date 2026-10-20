package com.example.newbeemallapiv2.config;

import com.example.newbeemallapiv2.common.NewBeeMallException;
import com.example.newbeemallapiv2.util.Result;
import com.example.newbeemallapiv2.util.ResultGenerator;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class NewBeeMallExceptionHandler {

    @ExceptionHandler(NewBeeMallException.class)
    public Result handleException(NewBeeMallException e) {
        return ResultGenerator.genErrorResult(500, e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public Result handleUnknownException(
            Exception exception
    ) {
        exception.printStackTrace();
        return ResultGenerator.genErrorResult(500, "服务器内部错误");
    }
}
