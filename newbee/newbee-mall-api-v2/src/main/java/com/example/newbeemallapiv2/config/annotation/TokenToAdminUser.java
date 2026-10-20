package com.example.newbeemallapiv2.config.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface TokenToAdminUser {
    /**
     * 默认值
     * @return
     */
    String value() default "adminUser";
}
