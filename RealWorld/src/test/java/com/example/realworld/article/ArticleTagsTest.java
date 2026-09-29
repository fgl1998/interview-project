package com.example.realworld.article;

import com.example.realworld.article.controller.ArticleController;
import com.example.realworld.article.entity.ArticleQueryRow;
import com.example.realworld.article.entity.ArticleTag;
import com.example.realworld.article.mapper.ArticleMapper;
import com.example.realworld.article.service.ArticleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

class ArticleTagsTest {
    private MockMvc mvc;
    private final List<List<Long>> tagQueries = new ArrayList<>();

    private ArticleQueryRow article(long id) {
        var article = new ArticleQueryRow();
        ReflectionTestUtils.setField(article, "id", id);
        return article;
    }

    private ArticleTag tag(long articleId, String name) {
        var tag = new ArticleTag();
        tag.setArticleId(articleId);
        ReflectionTestUtils.setField(tag, "name", name);
        return tag;
    }

    @BeforeEach
    void setUp() {
        ArticleMapper mapper = mock(ArticleMapper.class, invocation -> switch (invocation.getMethod().getName()) {
            case "countArticles" -> 2L;
            case "queryArticles", "queryArticlesByAuthorId", "queryArticlesByFavoriteUser" ->
                    List.of(article(12), article(13));
            case "queryArticleDetail" -> article(12);
            case "queryArticleTags" -> {
                tagQueries.add(invocation.getArgument(0));
                yield List.of(tag(12, "Java"), tag(12, "Spring"));
            }
            default -> null;
        });
        mvc = MockMvcBuilders.standaloneSetup(new ArticleController(new ArticleService(mapper))).build();
    }

    @Test
    void paginatedArticlesReturnTagsInOneBatchAndEmptyArraysForUntaggedArticles() throws Exception {
        mvc.perform(post("/api/articles/queryArticles").requestAttr("currentUserId", 7L)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"pageNumber\":1,\"pageSize\":10}"))
                .andExpect(jsonPath("$.data.list[0].tags[0]").value("Java"))
                .andExpect(jsonPath("$.data.list[0].tags[1]").value("Spring"))
                .andExpect(jsonPath("$.data.list[1].tags").isEmpty());
        assertThat(tagQueries).containsExactly(List.of(12L, 13L));
    }

    @Test
    void detailAndUserListsRetainArticleTags() throws Exception {
        mvc.perform(post("/api/articles/getArticleDetailBySlug").requestAttr("currentUserId", 7L)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"java\"}"))
                .andExpect(jsonPath("$.data.tags[0]").value("Java"));
        for (String endpoint : List.of("queryArticlesByAuthorId", "queryArticlesByFavoriteUser")) {
            String body = endpoint.equals("queryArticlesByAuthorId") ? "{\"authorId\":7}" : "{}";
            mvc.perform(post("/api/articles/" + endpoint).requestAttr("currentUserId", 7L)
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(jsonPath("$.data[0].tags[0]").value("Java"))
                    .andExpect(jsonPath("$.data[1].tags").isEmpty());
        }
        assertThat(tagQueries).containsExactly(List.of(12L), List.of(12L, 13L), List.of(12L, 13L));
    }
}
