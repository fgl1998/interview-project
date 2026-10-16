package com.example.newbeemallapiv2.hello;

import org.springframework.stereotype.Service;

//@Service告诉 Spring：请创建并管理一个 HelloService 对象。
//⬜ Service → Mapper
//        ⬜ MyBatis 查询 users
@Service
public class HelloService {
    public HelloService() {
        System.out.println("1. 创建 HelloService");
    }

    public String sayHello2() {
        return "Hello Spring Service";
    }
    public Test sayHello() {
        return new Test("11111");
    }
}

