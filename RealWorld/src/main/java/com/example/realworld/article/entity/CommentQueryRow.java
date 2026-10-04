package com.example.realworld.article.entity;

import java.time.LocalDateTime;

public class CommentQueryRow {
    private Long id;
        private Long articleId;
    private Long authorId;
    private String body;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String authorUsername;
    private String authorBio;
    private String authorImage;
    private Boolean following;

    public Boolean getFollowing() {
        return following;
    }
    public void setFollowing(Boolean following) {
        this.following = following;
    }
    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public Long getArticleId() {
        return articleId;
    }
    public void setArticleId(Long articleId) {
        this.articleId = articleId;
    }
    public Long getAuthorId() {
        return authorId;
    }
    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }
    public String getBody() {
        return body;
    }
    public void setBody(String body) {
        this.body = body;
    }
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    public String getAuthorUsername() {
        return authorUsername;
    }
    public void setAuthorUsername(String authorUsername) {
        this.authorUsername = authorUsername;
    }
    public String getAuthorBio() {
        return authorBio;
    }
    public void setAuthorBio(String authorBio) {
        this.authorBio = authorBio;
    }
    public String getAuthorImage() {
        return authorImage;
    }
    public void setAuthorImage(String authorImage) {
        this.authorImage = authorImage;
    }
}
