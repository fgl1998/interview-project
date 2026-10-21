package com.example.newbeemallapiv2.service.impl;

import com.example.newbeemallapiv2.dao.CarouselMapper;
import com.example.newbeemallapiv2.entity.Carousel;
import com.example.newbeemallapiv2.service.NewBeeMallCarouselService;
import com.example.newbeemallapiv2.util.PageQueryUtil;
import com.example.newbeemallapiv2.util.PageResult;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NewBeeMallCarouselServiceImpl implements NewBeeMallCarouselService {

    private final CarouselMapper carouselMapper;
    public NewBeeMallCarouselServiceImpl(CarouselMapper carouselMapper) {
        this.carouselMapper = carouselMapper;
    }
    @Override
    public PageResult getCarouselPage(PageQueryUtil pageUtil) {
        List<Carousel> carousels=carouselMapper.findCarouselList(pageUtil.getQueryMap());
        int total=carouselMapper.getTotalCarousels();
        PageResult pageResult=new PageResult(carousels,total,pageUtil.getLimit(),pageUtil.getPage());
        return pageResult;
    }
}
