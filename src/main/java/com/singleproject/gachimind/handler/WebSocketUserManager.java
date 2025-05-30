package com.singleproject.gachimind.handler;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class WebSocketUserManager {
    private final Map<String, String> sessionIdToUserId = new LinkedHashMap<>();

    public void addUser(String sessionId, String userId) {
        sessionIdToUserId.put(sessionId, userId);
    }

    public void removeUser(String sessionId) {
        sessionIdToUserId.remove(sessionId);
    }

    public String getUserId(String sessionId) {
        return sessionIdToUserId.get(sessionId);
    }

    public List<String> getUserList() {
        return new ArrayList<>(sessionIdToUserId.values());
    }

    public String getFirstUserId() {
        return sessionIdToUserId.values().stream().findFirst().orElse(null);
    }

    public void promoteToHost(String userId) {
        String targetSessionId = null;

        // 1. 해당 userId의 sessionId를 찾기
        for (Map.Entry<String, String> entry : sessionIdToUserId.entrySet()) {
            if (entry.getValue().equals(userId)) {
                targetSessionId = entry.getKey();
                break;
            }
        }

        // 2. 해당 세션이 존재하면 순서 재조정
        if (targetSessionId != null) {
            // LinkedHashMap은 순서가 유지되므로 재구성
            Map<String, String> newMap = new LinkedHashMap<>();
            newMap.put(targetSessionId, userId); // 맨 앞에 정답자 추가

            // 나머지 유저 추가
            for (Map.Entry<String, String> entry : sessionIdToUserId.entrySet()) {
                if (!entry.getKey().equals(targetSessionId)) {
                    newMap.put(entry.getKey(), entry.getValue());
                }
            }

            // 원래 맵 교체
            sessionIdToUserId.clear();
            sessionIdToUserId.putAll(newMap);
        }
    }
}
