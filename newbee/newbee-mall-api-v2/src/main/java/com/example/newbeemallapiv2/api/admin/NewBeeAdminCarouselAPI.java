package com.example.newbeemallapiv2.api.admin;

import com.example.newbeemallapiv2.config.annotation.TokenToAdminUser;
import com.example.newbeemallapiv2.entity.AdminUserToken;
import com.example.newbeemallapiv2.service.NewBeeMallCarouselService;
import com.example.newbeemallapiv2.util.PageQueryUtil;
import com.example.newbeemallapiv2.util.PageResult;
import com.example.newbeemallapiv2.util.Result;
import com.example.newbeemallapiv2.util.ResultGenerator;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/manage-api/v1")
public class NewBeeAdminCarouselAPI {
    private final NewBeeMallCarouselService newBeeMallCarouselService;
    public NewBeeAdminCarouselAPI(NewBeeMallCarouselService newBeeMallCarouselService) {
        this.newBeeMallCarouselService = newBeeMallCarouselService;
    }

    @RequestMapping(value = "/carousels", method = RequestMethod.GET)
    public Result list(Integer pageNumber, Integer pageSize, @TokenToAdminUser AdminUserToken adminUserToken) {
        PageQueryUtil pageUtil=new PageQueryUtil(pageNumber,pageSize);
        PageResult pageResult= newBeeMallCarouselService.getCarouselPage(pageUtil);
        return ResultGenerator.genSuccessResult(pageResult);
    }
}
