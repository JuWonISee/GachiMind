package com.singleproject.gachimind.handler;

import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.List;

@Component
@Log4j2
public class ChatHandler extends TextWebSocketHandler {
    private static final int MAX_USERS = 3;
    private static List<WebSocketSession> list = new ArrayList<WebSocketSession>();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload(); //페이로드란 전송되는 데이터를 의미한다.
        log.info("payload : " + payload);

        for(WebSocketSession session1 : list) {
            if(session1.isOpen()) {
                session1.sendMessage(new TextMessage(payload));
            }
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if(list.size() >= MAX_USERS) {
            log.info(session + "접속 거부 : 최대 접속 인원 초과");
            session.close(CloseStatus.POLICY_VIOLATION.withReason("최대 접속 인원 초과"));
            return;
        }

        list.add(session);
        log.info(session + "클라이언트 접속");
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info(session + " 클라이언트 접속 해제");
        list.remove(session);
    }
}
