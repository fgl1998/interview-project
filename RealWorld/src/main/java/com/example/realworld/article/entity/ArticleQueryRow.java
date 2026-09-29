package com.example.realworld.article.entity;

import java.time.LocalDateTime;
import java.util.List;

public class ArticleQueryRow {
    private Long id;
    private String slug;
    private String title;
    private String description;
    private String body;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long authorId;

    private String authorUsername;
    private String authorBio;
    private String authorImage;

    private Boolean favorited;
    private Long favoritesCount;
    private List<String> tags = List.of();

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public ArticleQueryRow() {
    }

    public Long getId() {
        return id;
    }

    public String getSlug() {
        return slug;
    }
    public String getTitle() {
        return title;
    }
    public String getDescription() {
        return description;
    }
    public String getBody() {
        return body;
    }
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    public String getAuthorUsername() {
        return authorUsername;
    }
    public String getAuthorBio() {
        return authorBio;
    }
    public String getAuthorImage() {
        return authorImage;
    }
    public Boolean getFavorited() {
        return favorited;
    }
    public Long getFavoritesCount() {
        return favoritesCount;
    }
    public Long getAuthorId() {
        return authorId;
    }
}
