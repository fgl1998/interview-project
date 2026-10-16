package com.example.newbeemallapiv2.hello;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

//项目启动时，Spring 大致完成了这些事情：
//        扫描到 @Service
//        ↓
//        创建 HelloService 对象
//        ↓
//        扫描到 @RestController
//        ↓
//        准备创建 HelloController 对象
//        ↓
//        发现构造函数需要 HelloService
//        ↓
//        把前面创建的 HelloService 对象传入构造函数
//        ↓
//        创建 HelloController 对象

@RestController
public class HelloController {
    private final HelloService helloService;

    public HelloController(HelloService helloService) {
        System.out.println("2. 创建 HelloController");
        this.helloService = helloService;
    }

    @GetMapping("/api/hello")
    public Test hello() {
        return helloService.sayHello();
    }
}