package com.example.realworld.article;

import com.example.realworld.article.controller.ArticleController;
import com.example.realworld.article.mapper.ArticleMapper;
import com.example.realworld.article.service.ArticleService;
import com.example.realworld.common.exception.GlobalExceptionHandler;
import org.apache.ibatis.mapping.ParameterMapping;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

class ArticleAuthorQueryTest {
    private final List<Object[]> queries = new ArrayList<>();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        ArticleMapper mapper = mock(ArticleMapper.class, invocation -> {
            if (invocation.getMethod().getName().equals("queryArticlesByAuthorId")) {
                queries.add(invocation.getArguments());
                return List.of();
            }
            return null;
        });
        mvc = MockMvcBuilders.standaloneSetup(new ArticleController(new ArticleService(mapper)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void queriesSelectedAuthorWithFavoriteStateForTheLoggedInViewer() throws Exception {
        mvc.perform(post("/api/articles/queryArticlesByAuthorId")
                        .requestAttr("currentUserId", 7L).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authorId\":8}"))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
        assertThat(queries).hasSize(1);
        assertThat(queries.get(0)).containsExactly(7L, 8L);
    }

    @Test
    void queriesCurrentUserOnlyWhenExplicitlyPassedAsAuthor() throws Exception {
        mvc.perform(post("/api/articles/queryArticlesByAuthorId")
                        .requestAttr("currentUserId", 7L).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authorId\":7}"))
                .andExpect(jsonPath("$.success").value(true));
        assertThat(queries).hasSize(1);
        assertThat(queries.get(0)).containsExactly(7L, 7L);
    }

    @Test
    void rejectsMissingAuthorIdInsteadOfDefaultingToCurrentUser() throws Exception {
        for (String body : List.of("{}", "", "null", "{\"authorId\":null}")) {
            mvc.perform(post("/api/articles/queryArticlesByAuthorId")
                            .requestAttr("currentUserId", 7L).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.code").value(400));
        }
        assertThat(queries).isEmpty();
    }

    @Test
    void rejectsInvalidAuthorIdBeforeQuerying() throws Exception {
        for (String body : List.of("{\"authorId\":0}", "{\"authorId\":-1}")) {
            mvc.perform(post("/api/articles/queryArticlesByAuthorId")
                            .requestAttr("currentUserId", 7L).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.code").value(400));
        }
        assertThat(queries).isEmpty();
    }

    @Test
    void mapperBindsViewerAndAuthorSeparately() {
        Configuration configuration = new Configuration();
        configuration.addMapper(ArticleMapper.class);
        var sql = configuration.getMappedStatement(ArticleMapper.class.getName() + ".queryArticlesByAuthorId")
                .getBoundSql(Map.of("userId", 7L, "authorId", 8L));
        assertThat(sql.getParameterMappings().stream().map(ParameterMapping::getProperty).toList())
                .containsExactly("userId", "authorId");
    }
}
