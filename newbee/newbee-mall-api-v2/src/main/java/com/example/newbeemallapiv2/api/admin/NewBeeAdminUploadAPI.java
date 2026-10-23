package com.example.newbeemallapiv2.api.admin;

import com.example.newbeemallapiv2.common.Constants;
import com.example.newbeemallapiv2.config.annotation.TokenToAdminUser;
import com.example.newbeemallapiv2.entity.AdminUserToken;
import com.example.newbeemallapiv2.util.Result;
import com.example.newbeemallapiv2.util.ResultGenerator;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;

@RestController
@RequestMapping("/manage-api/v1")
public class NewBeeAdminUploadAPI {
    private static final Logger logger = LoggerFactory.getLogger(NewBeeAdminUploadAPI.class);

    @RequestMapping(value = "/upload/file", method = RequestMethod.POST)
    public Result upload(
            HttpServletRequest httpServletRequest,
            @RequestParam("file") MultipartFile file,
            @TokenToAdminUser AdminUserToken adminUserToken) {
        logger.info("adminUser:{}", adminUserToken.toString());

        String fileName = file.getOriginalFilename();
        String suffixName = fileName.substring(fileName.lastIndexOf("."));
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd_HHmmss");
        Random r = new Random();

        StringBuilder tempName = new StringBuilder();
        tempName.append(sdf.format(new Date()));
        tempName.append(r.nextInt(100));
        tempName.append(suffixName);

        String newFileName = tempName.toString();

        File fileDirectory = new File(Constants.FILE_UPLOAD_DIC);

        File destFile = new File(Constants.FILE_UPLOAD_DIC + newFileName);

        try{
            if(!fileDirectory.exists()){
                if(!fileDirectory.mkdirs()){
                    throw new IOException("文件夹创建失败！");
                }
            }
            file.transferTo(destFile);
            Object url=new URL("http://127.0.0.1:28020"+httpServletRequest.getRequestURI()+"upload"+newFileName);
            logger.info("file url:{}", url.toString());

            return ResultGenerator.genSuccessResult(url.toString());
        }catch (IOException e){
            return ResultGenerator.genFailResult("文件上传失败！");
        }
    }
}
