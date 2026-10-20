package com.example.newbeemallapiv2.util;

import com.example.newbeemallapiv2.dao.AdminUserMapper;
import com.example.newbeemallapiv2.dao.AdminUserTokenMapper;
import com.example.newbeemallapiv2.entity.AdminUserToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.security.MessageDigest;

public class SystemUtil {
    /**
     * 生成token
     * @param src
     * @return
     */
    public static String genToken(String src){
        if(src == null || "".equals(src)){
            return null;
        }
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(src.getBytes());
            String result = new BigInteger(1, md.digest()).toString(16);
            if (result.length() == 31) {
                result = result + "-";
            }
            return result;
        }catch (Exception e){
            return null;
        }
    }
}
