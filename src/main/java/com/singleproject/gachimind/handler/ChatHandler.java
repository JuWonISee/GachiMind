package com.singleproject.gachimind.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;

@Component
@Log4j2
public class ChatHandler extends TextWebSocketHandler {

    private static final int MAX_USERS = 40;
    private static final List<WebSocketSession> sessions = new ArrayList<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private String currentQuiz = null;

    @Autowired
    private WebSocketUserManager userManager;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (sessions.size() >= MAX_USERS) {
            log.info(session + " 접속 거부: 최대 접속 인원 초과");
            session.close(new CloseStatus(4001, "최대 접속 인원 초과")); // 4002 코드
            return;
        }

        String userId = extractUserId(session);

        if (userManager.getUserList().contains(userId)) {
            // 중복 닉네임 거부
            Map<String, Object> errorMsg = Map.of(
                    "type", "nicknameError",
                    "message", "이미 사용 중인 닉네임입니다."
            );
            String json = objectMapper.writeValueAsString(errorMsg);
            session.sendMessage(new TextMessage(json));

            session.close(new CloseStatus(4002, "닉네임 중복"));  // 4001 코드
            return;
        }

        userManager.addUser(session.getId(), userId);
        sessions.add(session);

        log.info(userId + " 클라이언트 접속");

        sendUserListToAll();
        broadcastDrawerInfo();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = userManager.getUserId(session.getId());
        userManager.removeUser(session.getId());
        sessions.remove(session);

        log.info(userId + " 클라이언트 접속 해제");

        sendUserListToAll();
        broadcastDrawerInfo();

        // 방장 변경 체크
        String currentHost = userManager.getFirstUserId();

        // 만약 방장이 변경되었고, 방장이 퇴장한 사람과 다르면
        if (userId != null && !userId.equals(userId)) {
            // 방장 변경된 상태 (원래 방장이 나갔으면 첫 번째가 바뀜)
            Map<String, Object> hostChangedMsg = Map.of(
                    "type", "hostChanged",
                    "host", currentHost,
                    "clearCanvas", true,
                    "message", "방장이 퇴장하여 문제가 초기화됩니다."
            );
            broadcastMessage(hostChangedMsg);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.info("payload : " + payload);

        // 방장 변경 체크
        String currentHost = userManager.getFirstUserId();

        try {
            Map<String, Object> msg = objectMapper.readValue(payload, Map.class);
            String type = (String) msg.get("type");
            String userId = userManager.getUserId(session.getId());
            String hostId = userManager.getFirstUserId();

            if ("quizInput".equals(type)) {
                // 방장만 문제 등록 가능
                System.out.println(1);
                if (!userId.equals(hostId)) {
                    // 방장이 아니면 무시 혹은 거부 메시지 (원하면)
                    return;
                }

                String quiz = (String) msg.get("quiz");
                currentQuiz = quiz;
                log.info("새 문제 등록: " + quiz);
                // 모든 클라이언트에 문제 등록 메시지 전송 (필요시)
                Map<String, Object> quizMsg = Map.of(
                        "type", "quizInput",
                        "host", currentHost,
                        "quiz", quiz
                );
                System.out.println(quizMsg);

                broadcastMessage(quizMsg);
                return;
            }

            if ("chat".equals(type)) {
                String chatMsg = (String) msg.get("message");

                if (currentQuiz != null && chatMsg.equalsIgnoreCase(currentQuiz) && !userId.equals(hostId)) {
                    userManager.promoteToHost(userId); // 이 메서드를 추가로 만들어야 함

                    Map<String, Object> correctMsg = Map.of(
                            "type", "quizCorrect",
                            "username", userId,
                            "message", "정답입니다! 문제와 캔버스를 초기화합니다.",
                            "quiz", currentQuiz
                    );

                    broadcastMessage(correctMsg);

                    // 방장 변경 메시지
                    Map<String, Object> hostChangedMsg = Map.of(
                            "type", "hostChanged",
                            "host", userId,
                            "message", userId + "님이 문제를 낼 차례입니다."
                    );
                    broadcastMessage(hostChangedMsg);

                    // userList 갱신
                    sendUserListToAll();

                    currentQuiz = null; // 문제 초기화
                }

                broadcastMessage(msg);
            } else if ("canvas".equals(type)) {
                // 캔버스 메시지는 그대로 방송
                broadcastMessage(msg);
            }
        } catch (Exception e) {
            log.warn("Invalid JSON received: " + payload);
//            String userId = userManager.getUserId(session.getId());
//            Map<String, Object> chatMsg = Map.of(
//                    "type", "chat",
//                    "username", userId,
//                    "message", payload
//            );
//            broadcastMessage(chatMsg);
        }
    }

    private void broadcastMessage(Map<String, Object> message) throws Exception {
        String json = objectMapper.writeValueAsString(message);
        for (WebSocketSession sess : sessions) {
            if (sess.isOpen()) {
                sess.sendMessage(new TextMessage(json));
            }
        }
    }

    private void sendUserListToAll() throws Exception {
        List<String> userList = userManager.getUserList();
        String host = userList.isEmpty() ? null : userList.get(0); // 가장 먼저 들어온 사람

        Map<String, Object> userListMsg = Map.of(
                "type", "userList",
                "users", userList,
                "host", host
        );

        broadcastMessage(userListMsg);
    }

    private void broadcastDrawerInfo() throws Exception {
        String drawerId = getCurrentDrawerId();
        Map<String, Object> drawerInfo = Map.of(
                "type", "drawerInfo",
                "drawerId", drawerId
        );
        broadcastMessage(drawerInfo);
    }

    private String getCurrentDrawerId() {
        if (sessions.isEmpty()) return null;
        return userManager.getUserId(sessions.get(0).getId());
    }

    private String extractUserId(WebSocketSession session) {
        String query = session.getUri().getQuery(); // e.g., id=홍길동
        if (query != null && query.startsWith("id=")) {
            return query.substring(3);
        }
        return "Unknown";
    }
}
