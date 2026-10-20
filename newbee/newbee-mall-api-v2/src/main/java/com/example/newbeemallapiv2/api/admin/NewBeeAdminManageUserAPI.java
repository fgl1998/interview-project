package com.example.newbeemallapiv2.api.admin;

import ch.qos.logback.core.util.StringUtil;
import com.example.newbeemallapiv2.api.admin.param.AdminLoginParam;
import com.example.newbeemallapiv2.common.Constants;
import com.example.newbeemallapiv2.common.ServiceResultEnum;
import com.example.newbeemallapiv2.entity.AdminUser;
import com.example.newbeemallapiv2.entity.AdminUserToken;
import com.example.newbeemallapiv2.service.AdminManageUserService;
import com.example.newbeemallapiv2.util.AdminUserInfoByToken;
import com.example.newbeemallapiv2.util.Result;
import com.example.newbeemallapiv2.util.ResultGenerator;
import com.example.newbeemallapiv2.util.SystemUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;

@RestController
@RequestMapping("/manage-api/v1")
public class NewBeeAdminManageUserAPI {
    private static final Logger logger = LoggerFactory.getLogger(NewBeeAdminManageUserAPI.class);
    private final AdminManageUserService adminManageUserService;

    @Autowired
    private AdminUserInfoByToken adminUserInfoByToken;


    public NewBeeAdminManageUserAPI(AdminManageUserService adminManageUserService) {
        this.adminManageUserService = adminManageUserService;
    }

    @RequestMapping(value = "/adminUser/login", method = RequestMethod.POST)
    public Result<String> login(@RequestBody @Valid AdminLoginParam adminLoginParam) {
        String loginResult = adminManageUserService.login(adminLoginParam.getUserName(), adminLoginParam.getPasswordMd5());

        logger.info("manage login api,adminName={},loginResult={}", adminLoginParam.getUserName(), loginResult);

        if (StringUtils.hasText(loginResult) && loginResult.length() == Constants.TOKEN_LENGTH) {
            Result result = ResultGenerator.genSuccessResult();
            result.setData(loginResult);
            return result;
        }
        return ResultGenerator.genFailResult(loginResult);
    }

    @RequestMapping(value = "/adminUser/profile", method = RequestMethod.GET)
    public Result profile(HttpServletRequest request) {
        String token= request.getHeader("token");
        AdminUserToken adminUserToken = adminUserInfoByToken.getAdminUserToken(token);

//        AdminUserToken adminUserToken = new AdminUserToken();
//        adminUserToken.setAdminUserId(1L);

        logger.info("adminUserToken={}", adminUserToken.toString());

        AdminUser adminUser = adminManageUserService.getUserDetailById(adminUserToken.getAdminUserId());
        if (adminUser != null) {
            adminUser.setLoginPassword("******");
//            Result result=ResultGenerator.genSuccessResult();
//            result.setData(adminUser);
            Result result = ResultGenerator.genSuccessResult(adminUser);
            return result;
        }
        return ResultGenerator.genFailResult(ServiceResultEnum.DATA_NOT_EXIST.getResult());
    }
}
