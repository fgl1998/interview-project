package com.example.newbeemallapiv2.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI newBeeMallOpenAPI() {
        return new OpenAPI()
                .info(new Info().title("Newbee-Mall API").version("v2"))
                .schemaRequirement("token", new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.HEADER)
                        .name("token"));
    }


    @Bean
    public GlobalOpenApiCustomizer adminTokenSecurityCustomizer() {
        return openApi -> openApi.getPaths().forEach((path, item) -> {
            // 后台管理接口（login 除外）都声明需要 token
            if (path.startsWith("/manage-api/") && !path.contains("/login")) {
                item.readOperations()
                        .forEach(operation -> operation.addSecurityItem(
                                new SecurityRequirement().addList("token")));
            }
        });
    }
}