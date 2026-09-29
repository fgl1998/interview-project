package com.example.realworld.article.mapper;

import com.example.realworld.article.entity.Article;
import com.example.realworld.article.entity.ArticleQueryRow;
import com.example.realworld.article.entity.ArticleTag;
import com.example.realworld.article.entity.CommentQueryRow;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface ArticleMapper {
    @Insert("""
            INSERT INTO articles(title,description,body,author_id,slug)
            VALUES(#{title},#{description},#{body},#{authorId},#{slug})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insertArticle(Article article);

    @Insert("""
            <script>
            INSERT INTO article_tags (article_id, tag_id)
            VALUES
            <foreach collection="tagIds" item="tagId" separator=",">
                (#{articleId}, #{tagId})
            </foreach>
            </script>
            """)
    int insertArticleTags(@Param("articleId") Long articleId, @Param("tagIds") List<Long> tagIds);

    @Select("""
            <script>
            SELECT at.article_id AS articleId, at.tag_id AS tagId, t.name
            FROM article_tags at
            JOIN tags t ON t.id=at.tag_id
            WHERE at.article_id IN
            <foreach collection="articleIds" item="articleId" open="(" separator="," close=")">
                #{articleId}
            </foreach>
            ORDER BY at.article_id, t.id
            </script>
            """)
    List<ArticleTag> queryArticleTags(@Param("articleIds") List<Long> articleIds);

    @Select("""
            SELECT
                    a.id,
                    a.slug,
                    a.title,
                    a.description,
                    a.body,
                    a.created_at,
                    a.updated_at,
                    a.author_id,
                    u.username AS author_username,
                    u.bio AS author_bio,
                    u.image AS author_image,
                    
                    EXISTS(
                      SELECT 1
                      FROM favorites f
                      WHERE f.user_id = #{userId}
                      AND f.article_id = a.id
                    ) AS favorited,
                    
                    (
                    SELECT COUNT(*)
                    FROM favorites f
                    WHERE f.article_id = a.id
                    ) AS favorites_count
                    
                  FROM articles a
                  JOIN users u ON a.author_id = u.id
                  WHERE a.title LIKE CONCAT('%', COALESCE(#{keyword}, ''), '%')
                  ORDER BY a.created_at DESC
                  LIMIT #{limit} OFFSET #{offset}
            """)
    List<ArticleQueryRow> queryArticles(
            @Param("userId") Long userId,
            @Param("keyword") String keyword,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    @Select("""
            SELECT
                    articles.id,
                    articles.slug,
                    articles.title,
                    articles.description,
                    articles.body,
                    articles.author_id,
                    articles.created_at,
                    articles.updated_at,
                    users.username AS author_username,
                    users.bio AS author_bio,
                    users.image AS author_image,
                    EXISTS(
                        SELECT 1 FROM favorites f
                        WHERE f.user_id=#{userId} AND f.article_id=articles.id
                    ) AS favorited,
                    (
                    SELECT COUNT(*) FROM favorites WHERE favorites.article_id=articles.id
                    ) AS favorites_count
                        
                  FROM articles
                  JOIN users ON users.id=articles.author_id
                  WHERE articles.author_id=#{authorId}
                  ORDER BY articles.created_at DESC, articles.id DESC
            """)
    List<ArticleQueryRow> queryArticlesByAuthorId(@Param("userId") Long userId, @Param("authorId") Long authorId);

    @Select("""
            SELECT
                    articles.id,
                    articles.slug,
                    articles.title,
                    articles.description,
                    articles.body,
                    articles.author_id,
                    articles.created_at,
                    articles.updated_at,
                    users.username AS author_username,
                    users.bio AS author_bio,
                    users.image AS author_image,
                        
                    (
                    SELECT COUNT(*) FROM favorites WHERE favorites.article_id=articles.id
                    ) AS favorites_count
                        
                  FROM favorites
            			JOIN articles ON articles.id=favorites.article_id
            			JOIN users ON users.id=articles.author_id
                  WHERE favorites.user_id= #{userId}
            """)
    List<ArticleQueryRow> queryArticlesByFavoriteUser(@Param("userId") Long userId);


    @Select("""
        SELECT COUNT(*)
        FROM articles a
        WHERE a.title LIKE CONCAT('%', COALESCE(#{keyword}, ''), '%')
        """)
    long countArticles(@Param("keyword") String keyword);

    @Select("""
            SELECT
                    articles.id,
                    articles.slug,
                    articles.title,
                    articles.description,
                    articles.body,
                    articles.author_id,
                    articles.created_at,
                    articles.updated_at,
                       
                    users.username AS author_username,
                    users.bio AS author_bio,
                    users.image AS author_image,
                       
                  EXISTS(
                    SELECT 1 FROM follows WHERE follows.follower_id=#{userId} AND follows.following_id=articles.author_id
                  ) AS following,
                  EXISTS(
                    SELECT 1 FROM favorites WHERE favorites.user_id=#{userId} AND favorites.article_id=articles.id
                  ) AS favorited,
                  (
                    SELECT COUNT(*) FROM favorites WHERE favorites.article_id=articles.id
                  )AS favorites_count
                       
                  FROM articles
                  JOIN users ON users.id=articles.author_id
                       
                  WHERE  articles.slug=#{slug}
            """)
    ArticleQueryRow queryArticleDetail(@Param("userId") Long userId, @Param("slug") String slug);

    @Delete("""
            DELETE FROM articles WHERE id=#{id}
            """)
    int deleteArticle(@Param("id") Long id);

    @Delete("""
             DELETE FROM favorites WHERE user_id=#{userId} AND article_id=#{articleId}
            """)
    int unfavorite(@Param("userId") Long userId, @Param("articleId") Long articleId);

    @Insert("""
            INSERT IGNORE INTO favorites (user_id,article_id) VALUES (#{userId},#{articleId})
            """)
    int favorite(@Param("userId") Long userId, @Param("articleId") Long articleId);

    @Insert("""
            INSERT INTO comments (author_id,article_id,body) VALUES (#{authorId},#{articleId},#{body})
            """)
    int insertComment(@Param("authorId") Long authorId, @Param("articleId") Long articleId, @Param("body") String body);

    @Select("""
            SELECT
                    comments.id,
                    comments.article_id,
                    comments.author_id,
                    comments.body,
                    comments.created_at,
                    comments.updated_at,
                        
                    users.username AS author_username,
                    users.bio AS author_bio,
                    users.image AS author_image,
                        
                    EXISTS (
                      SELECT 1
                      FROM follows
                      WHERE follows.follower_id = #{userId}
                        AND follows.following_id = comments.author_id
                    ) AS following
                        
                  FROM comments
                  JOIN users
                    ON users.id = comments.author_id
                  WHERE comments.article_id = #{articleId}
            """)
    List<CommentQueryRow> listComments(@Param("userId") Long userId, @Param("articleId") Long articleId);

    @Delete("""
             DELETE FROM comments WHERE id=#{id}
            """)
    int deleteComment(@Param("id") Long id);
}
