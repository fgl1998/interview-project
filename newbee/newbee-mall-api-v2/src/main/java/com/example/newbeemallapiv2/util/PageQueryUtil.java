package com.example.newbeemallapiv2.util;

import java.util.HashMap;
import java.util.Map;

public class PageQueryUtil {
    private int page;
    private int limit;
    private Map<String,Object> queryMap;

    public PageQueryUtil(int page, int limit) {
        this.page = page;
        this.limit = limit;
        this.queryMap=new HashMap<>();
        this.queryMap.put("page",page);
        this.queryMap.put("limit",limit);
        this.queryMap.put("start",(page-1)*limit);
    }
    public int getPage() {
        return page;
    }
    public int getLimit() {
        return limit;
    }
    public Map<String,Object> getQueryMap() {
        return queryMap;
    }
    public void setPage(int page) {
        this.page = page;
    }
    public void setLimit(int limit) {
        this.limit = limit;
    }
    public void setQueryMap(Map<String,Object> queryMap) {
        this.queryMap = queryMap;
    }
}
