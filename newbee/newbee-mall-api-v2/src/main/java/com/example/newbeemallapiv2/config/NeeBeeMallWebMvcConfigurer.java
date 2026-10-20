package com.example.newbeemallapiv2.config;

import com.example.newbeemallapiv2.config.annotation.TokenToAdminUser;
import com.example.newbeemallapiv2.config.handler.TokenToAdminUserMethodArgumentResolver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class NeeBeeMallWebMvcConfigurer implements WebMvcConfigurer {
    @Autowired
    private TokenToAdminUserMethodArgumentResolver tokenToAdminUserMethodArgumentResolver;

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> argumentResolvers) {
        argumentResolvers.add(tokenToAdminUserMethodArgumentResolver);
    }

}
