package com.example.realworld.article.entity;

public class ArticleTag {
    private Long articleId;
    private Long tagId;
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getArticleId() {
        return articleId;
    }
    public void setArticleId(Long articleId) {
        this.articleId = articleId;
    }
    public Long getTagId() {
        return tagId;
    }
    public void setTagId(Long tagId) {
        this.tagId = tagId;
    }
}
