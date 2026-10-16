package com.example.newbeemallapiv2.hello;

public class Test {
    private String test;
    public Test(String test){
        this.test = test;
    }

//    但返回给前端时值全丢了。 你的 Controller 是 @RestController，
//    用 Jackson 把 Result<List<ArticleQueryRow>> 序列化成 JSON。
//    Jackson 默认只认 public getter 或 public 字段，private 字段没有 getter 就读不到。
//    于是每个 ArticleQueryRow 被序列化成一个空对象 {}。
    public String getTest() {
        return test;
    }

}
