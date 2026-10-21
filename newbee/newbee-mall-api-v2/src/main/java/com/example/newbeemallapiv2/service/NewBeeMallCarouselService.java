package com.example.newbeemallapiv2.service;

import com.example.newbeemallapiv2.util.PageQueryUtil;
import com.example.newbeemallapiv2.util.PageResult;

public interface NewBeeMallCarouselService {
    PageResult getCarouselPage(PageQueryUtil pageUtil);
}
