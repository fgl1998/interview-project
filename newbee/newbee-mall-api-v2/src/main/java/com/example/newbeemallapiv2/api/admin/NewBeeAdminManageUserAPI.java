package com.example.newbeemallapiv2.api.admin;

import com.example.newbeemallapiv2.api.admin.param.AdminLoginParam;
import com.example.newbeemallapiv2.service.AdminManageUserService;
import com.example.newbeemallapiv2.util.Result;
import com.example.newbeemallapiv2.util.ResultGenerator;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/manage-api/v1")
public class NewBeeAdminManageUserAPI {
    private static final Logger logger = LoggerFactory.getLogger(NewBeeAdminManageUserAPI.class);
    private final AdminManageUserService adminManageUserService;
    public NewBeeAdminManageUserAPI(AdminManageUserService adminManageUserService) {
        this.adminManageUserService = adminManageUserService;
    }

    @RequestMapping(value = "/adminUser/login",method = RequestMethod.POST)
    public Result<String> login(@RequestBody @Valid AdminLoginParam adminLoginParam) {
        String loginResult = adminManageUserService.login(adminLoginParam.getUserName(), adminLoginParam.getPasswordMd5());
        logger.info("manage login api,adminName={},loginResult={}", adminLoginParam.getUserName(), loginResult);
        Result result = ResultGenerator.genSuccessResult();
        result.setData(loginResult);
        return result;
    }
}
