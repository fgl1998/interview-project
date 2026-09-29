package com.example.realworld.article.controller;

import com.example.realworld.article.dto.CreateArticleRequest;
import com.example.realworld.article.dto.CreateCommentRequest;
import com.example.realworld.article.dto.QueryArticleRequest;
import com.example.realworld.article.entity.ArticleQueryRow;
import com.example.realworld.article.entity.CommentQueryRow;
import com.example.realworld.article.service.ArticleService;
import com.example.realworld.common.PageResult;
import com.example.realworld.common.Result;
import com.example.realworld.common.exception.AppException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/articles")
public class ArticleController {
    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    /**
     * 创建文章
     */
    @PostMapping("/create")
    public Result<Long> createArticle(@Valid @RequestBody CreateArticleRequest request, HttpServletRequest httpServletRequest) {
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        Long articleId = articleService.create(request,currentUserId);
        return Result.success(articleId);
    }

    /**
     * 分页查询文章列表，支持关键字搜索
     */
    @PostMapping("/queryArticles")
    public Result<PageResult<ArticleQueryRow>> queryArticles(@Valid @RequestBody QueryArticleRequest request, HttpServletRequest httpServletRequest){
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        String keyWord = request.getKeyWord();
        int pageNumber = request.getPageNumber();
        int pageSize = request.getPageSize();
        PageResult<ArticleQueryRow> queryResult = articleService.queryArticles(currentUserId, keyWord, pageSize, pageNumber);
        return Result.success(queryResult);
    }

    /**
     * 根据slug获取文章详情
     */
    @PostMapping("/getArticleDetailBySlug")
    public Result<ArticleQueryRow> getArticleDetailBySlug(@RequestBody Map<String,String> body, HttpServletRequest httpServletRequest){
        String slug = body.get("slug");
        if(slug == null){
            throw new AppException(HttpStatus.BAD_REQUEST, "ARTICLE_SLUG", "Slug cannot be null");
        }
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        ArticleQueryRow articleQueryRow = articleService.getArticleDetailBySlug(currentUserId, slug);
        return Result.success(articleQueryRow);
    }

    /**
     * 查询指定作者的文章，authorId 必填；查询自己的文章也需传当前用户 ID
     */
    @PostMapping("/queryArticlesByAuthorId")
    public Result<List<ArticleQueryRow>> queryArticlesByAuthorId(
            @RequestBody Map<String, Long> body,
            HttpServletRequest httpServletRequest){
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        Long authorId = body.get("authorId");
        if (authorId == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "AUTHOR_ID", "作者 ID 不能为空");
        }
        if (authorId <= 0) {
            throw new AppException(HttpStatus.BAD_REQUEST, "AUTHOR_ID", "作者 ID 必须大于 0");
        }
        List<ArticleQueryRow> articleQueryRows = articleService.queryArticlesByAuthorId(currentUserId, authorId);
        return Result.success(articleQueryRows);
    }

    /**
     * 查询当前用户收藏的文章
     */
    @PostMapping("/queryArticlesByFavoriteUser")
    public Result<List<ArticleQueryRow>> queryArticlesByFavoriteUser(HttpServletRequest httpServletRequest){
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        List<ArticleQueryRow> articleQueryRows = articleService.queryArticlesByFavoriteUser(currentUserId);
        return Result.success(articleQueryRows);
    }


    /**
     * 删除文章
     */
    @PostMapping("/deleteArticle")
    public Result<Void> deleteArticle(@RequestBody Map<String,Long> body,HttpServletRequest httpServletRequest){
        Long articleId = body.get("articleId");
        if(articleId == null){
            throw new AppException(HttpStatus.BAD_REQUEST, "ARTICLE_ID", "Article ID cannot be null");
        }
        articleService.deleteArticle(articleId);
        return Result.success();
    }

    /**
     * 取消收藏文章
     */
    @PostMapping("/unfavorite")
    public Result<Void> unfavorite(@RequestBody Map<String,Long> body,HttpServletRequest httpServletRequest){
        Long articleId = body.get("articleId");
        if(articleId == null){
            throw new AppException(HttpStatus.BAD_REQUEST, "ARTICLE_ID", "Article ID cannot be null");
        }
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        articleService.unfavorite(currentUserId, articleId);
        return Result.success();
    }

    /**
     * 收藏文章
     */
    @PostMapping("/favorite")
    public Result<Void> favorite(@RequestBody Map<String,Long> body,HttpServletRequest httpServletRequest){
        Long articleId = body.get("articleId");
        if(articleId == null){
            throw new AppException(HttpStatus.BAD_REQUEST, "ARTICLE_ID", "Article ID cannot be null");
        }
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        articleService.favorite(currentUserId, articleId);
        return Result.success();
    }

    /**
     * 发表评论
     */
    @PostMapping("/comment/create")
    public Result<Void> createComment(@Valid @RequestBody CreateCommentRequest request, HttpServletRequest httpServletRequest){
        Long articleId = request.getArticleId();
        String commentBody = request.getBody();
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        articleService.createComment(currentUserId, articleId, commentBody);
        return Result.success();
    }

    /**
     * 删除评论
     */
    @PostMapping("/comment/delete")
    public Result<Void> deleteComment(@RequestBody Map<String,Long> body){
        Long commentId = body.get("commentId");
        if(commentId == null){
            throw new AppException(HttpStatus.BAD_REQUEST, "COMMENT_ID", "Comment ID cannot be null");
        }
        articleService.deleteComment(commentId);
        return Result.success();
    }

    /**
     * 查询文章评论列表
     */
    @PostMapping("/comment/queryComments")
    public  Result<List<CommentQueryRow>> queryComments(@RequestBody Map<String,Long> body,HttpServletRequest httpServletRequest){
        Long articleId = body.get("articleId");
        if(articleId == null){
            throw new AppException(HttpStatus.BAD_REQUEST, "ARTICLE_ID", "Article ID cannot be null");
        }
        Long currentUserId = (Long) httpServletRequest.getAttribute("currentUserId");
        List<CommentQueryRow> commentQueryResult = articleService.queryComments(currentUserId, articleId);
        return Result.success(commentQueryResult);
    }
}
