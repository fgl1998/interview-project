package com.example.newbeemallapiv2;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@MapperScan("com.example.newbeemallapiv2.dao")
@SpringBootApplication
public class NewbeeMallApiV2Application {

    public static void main(String[] args) {
        SpringApplication.run(NewbeeMallApiV2Application.class, args);
    }

}
