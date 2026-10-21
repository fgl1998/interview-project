package com.example.newbeemallapiv2.dao;

import com.example.newbeemallapiv2.entity.Carousel;
import com.example.newbeemallapiv2.util.PageQueryUtil;

import java.util.List;
import java.util.Map;

public interface CarouselMapper {
    int deleteByPrimaryKey(Integer carouselId);

    int insert(Carousel row);

    int insertSelective(Carousel row);

    Carousel selectByPrimaryKey(Integer carouselId);

    int updateByPrimaryKeySelective(Carousel row);

    int updateByPrimaryKey(Carousel row);

    List<Carousel> findCarouselList(Map<String, Object> params);

    int getTotalCarousels();
}