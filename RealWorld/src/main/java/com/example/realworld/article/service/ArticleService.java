package com.example.realworld.article.service;

import com.example.realworld.article.dto.CreateArticleRequest;
import com.example.realworld.article.entity.Article;
import com.example.realworld.article.entity.ArticleQueryRow;
import com.example.realworld.article.entity.ArticleTag;
import com.example.realworld.article.entity.CommentQueryRow;
import com.example.realworld.article.mapper.ArticleMapper;
import com.example.realworld.common.PageResult;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.xml.transform.Result;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ArticleService {
    private final ArticleMapper articleMapper;

    public ArticleService(ArticleMapper articleMapper) {
        this.articleMapper = articleMapper;
    }

    @Transactional
    public Long create(CreateArticleRequest request,Long currentUserId){
        Article article = new Article();
        article.setTitle(request.getTitle());
        article.setDescription(request.getDescription());
        article.setBody(request.getBody());
        article.setAuthorId(currentUserId);
        article.setSlug(generateSlug(request.getTitle()));
        articleMapper.insertArticle(article);

        if(!request.getTagsId().isEmpty()){
            articleMapper.insertArticleTags(article.getId(), request.getTagsId());
        }

        return article.getId();
    }

    private String generateSlug(String title) {
        String normalized = title
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\u4e00-\\u9fa5\\s-]", "")
                .replaceAll("[\\s_-]+", "-")
                .replaceAll("^-+|-+$", "");

        String suffix = UUID.randomUUID().toString().substring(0, 8);

        return !normalized.isBlank()
                ? normalized + "-" + suffix
                : "article-" + suffix;
    }

    public PageResult<ArticleQueryRow> queryArticles(Long currentUserId, String keyword, int pageSize, int pageNumber){
        if(pageSize>100){
            pageSize = 100;
        }
        int offset = (pageNumber - 1) * pageSize;
        long total = articleMapper.countArticles(keyword);
        List<ArticleQueryRow> list = total==0
                ?List.of()
                :articleMapper.queryArticles(currentUserId, keyword, pageSize, offset);
        return new PageResult<>(withTags(list),total,pageSize,pageNumber);
    }

    public List<ArticleQueryRow> queryArticlesByAuthorId(Long currentUserId, Long authorId){
        return withTags(articleMapper.queryArticlesByAuthorId(currentUserId, authorId));
    }

    public List<ArticleQueryRow> queryArticlesByFavoriteUser(Long currentUserId){
        return withTags(articleMapper.queryArticlesByFavoriteUser(currentUserId));
    }


    public ArticleQueryRow getArticleDetailBySlug(Long currentUserId, String slug){
        ArticleQueryRow article = articleMapper.queryArticleDetail(currentUserId, slug);
        if (article != null) withTags(List.of(article));
        return article;
    }

    private List<ArticleQueryRow> withTags(List<ArticleQueryRow> articles) {
        if (articles.isEmpty()) return articles;
        List<Long> articleIds = articles.stream().map(ArticleQueryRow::getId).toList();
        // 批量加载，避免列表中每篇文章单独查询标签。
        Map<Long, List<String>> tagsByArticle = articleMapper.queryArticleTags(articleIds).stream()
                .collect(Collectors.groupingBy(ArticleTag::getArticleId,
                        Collectors.mapping(ArticleTag::getName, Collectors.toList())));
        articles.forEach(article -> article.setTags(tagsByArticle.getOrDefault(article.getId(), List.of())));
        return articles;
    }

    public int deleteArticle(Long articleId){
        return articleMapper.deleteArticle(articleId);
    }

    public void unfavorite(Long userId, Long articleId){
        articleMapper.unfavorite(userId, articleId);
    }

    public void favorite(Long userId, Long articleId){
        articleMapper.favorite(userId, articleId);
    }

    public void createComment(Long userId, Long articleId, String body){
        articleMapper.insertComment(userId, articleId, body);
    }

    public void deleteComment(Long commentId){
        articleMapper.deleteComment(commentId);
    }

    public List<CommentQueryRow> queryComments(Long userId,Long articleId){
        return articleMapper.listComments(userId, articleId);
    }

}
