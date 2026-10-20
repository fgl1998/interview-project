package com.example.newbeemallapiv2.config.annotation;


import java.lang.annotation.*;

@Target({ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
//@Documented
public @interface TokenToMallUser {
    /**
     * 默认值
     * @return
     */
    String value() default "user";
}
