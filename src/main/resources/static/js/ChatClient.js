class ChatClient{
    constructor(username, url, msgInputId, msgAreaId){
        this.username = username;
        this.url = url;
        this.msgInput = document.getElementById(msgInputId);
        this.msgArea = document.getElementById(msgAreaId);
        this.websocket = null;
        this.userIds = null;

        this.onUserListUpdate = null;

        this.init();
    }

    init(){
        this.websocket = new WebSocket(`${this.url}?id=${encodeURIComponent(this.username)}`);
        this.websocket.onopen    = this.onOpen.bind(this);
        this.websocket.onclose   = this.onClose.bind(this);
        this.websocket.onmessage = this.onMessage.bind(this);
        
        this.msgInput.addEventListener("keyup", (e) => {
            if(e.key == "Enter" && this.msgInput.value.trim()){
                this.send(this.msgInput.value.trim());
                this.msgInput.value = "";
            }
        });
    }

    onOpen(event){
        if(event.code != 1008){
            this.websocket.send(JSON.stringify({
                type: "chat",
                username: this.username,
                message: `${this.username} 님이 입장하셨습니다.`
            }));
            
        }
    }

    onClose(event){
        if(event.code === 4001){
            alert("접속 인원 초과로 입장이 불가능 합니다.");

            this.disconnect();
            setNicknameAndConnect();
        }else if(event.code === 4002){
            alert("중복된 닉네임입니다.");
            
            this.disconnect();
            setNicknameAndConnect();
        }else{
            alert("서버와의 연결이 종료되었습니다.(" + event.code + ")");
        }
    }

    // 캔버스 이벤트 전송 메서드 추가
    sendCanvasEvent(data) {
        if(this.websocket && this.websocket.readyState === WebSocket.OPEN){
            const message = JSON.stringify({ type: "canvas", username: this.username, ...data });
            this.websocket.send(message);
        }
    }

    updateUserList(userIds) {
        const userDiv = document.getElementById("user");
        userDiv.innerHTML = "";

        // 내 아이디와 다른 유저 분리
        const myId = this.username;
        const others = userIds.filter(id => id !== myId);

        // 내 아이디 먼저 추가
        const myDiv = document.createElement("div");
        myDiv.textContent = myId;
        myDiv.style.fontWeight = "bold";
        myDiv.style.fontSize = "25px";
        userDiv.appendChild(myDiv);

        // 나머지 유저들 추가
        others.forEach(id => {
            const div = document.createElement("div");
            div.textContent = id;
            userDiv.appendChild(div);
        });
    }

    onMessage(event){
        let data;
        try {
            data = JSON.parse(event.data);
        } catch {

            // 기존 텍스트 메시지 처리 (호환성 유지)
            const [sessionId, ...msgParts] = event.data.split(":");
            const message = msgParts.join(":").trim();
            const isMyMessage = sessionId.trim() === this.username;

            const container = document.createElement("div");
            container.classList.add("msg-container");
            container.classList.add(isMyMessage ? "my-message" : "other-message");

            const content = document.createElement("div");
            content.classList.add("msg-content");
            content.innerHTML = `<b>${sessionId.trim()}</b><br>${message}`;

            container.appendChild(content);
            this.msgArea.appendChild(container);

            this.msgArea.scrollTop = this.msgArea.scrollHeight;

            return;
        }

        // 캔버스 메시지 처리
        if(data.type === "canvas" && data.username !== this.username){
            // 캔버스에 그리기
            if(this.onCanvasEvent) {
                this.onCanvasEvent(data);
            }
        } else if(data.type === "chat") {
            // 기존 채팅 메시지 처리
            const isMyMessage = data.username === this.username;

            const container = document.createElement("div");
            container.classList.add("msg-container");
            container.classList.add(isMyMessage ? "my-message" : "other-message");

            const content = document.createElement("div");
            content.classList.add("msg-content");
            content.innerHTML = `<b>${data.username}</b><br>${data.message}`;

            container.appendChild(content);
            this.msgArea.appendChild(container);

            this.msgArea.scrollTop = this.msgArea.scrollHeight;
        }else if (data.type === "userList") {            
            this.userIds = data.users; // 사용자 ID 목록 (예: ["user1", "user2"])
            this.updateUserList(this.userIds);    // 화면에 반영

            const myId = this.getMyId();
            const isHost = data.host === myId;

            toggleDrawingUI(isHost); // 출제자인지 여부에 따라 UI 제어

            if(this.onUserListUpdate){
                this.onUserListUpdate(this.userIds);
            }

            //콜백 호출
            if(this.onUserListUpdate){
                this.onUserListUpdate(this.userIds);
            }
        }else if (data.type === "hostChanged") {
            // UI 토글 (새 방장만 그리기 가능)
            const myId = this.getMyId();
            const isHost = data.host === myId;

            toggleDrawingUI(isHost);

            // 시스템 메시지로 알림 띄우기
            const container = document.createElement("div");
            container.classList.add("msg-container", "system-message");

            const content = document.createElement("div");
            content.classList.add("msg-content");
            content.innerHTML = `<i>${data.message}</i>`;

            container.appendChild(content);
            this.msgArea.appendChild(container);
            this.msgArea.scrollTop = this.msgArea.scrollHeight;

            // 방장이 변경되면 캔버스 초기화 호출
            clearAll();
        }else if(data.type === "quizInput") {
            // 방장한테만 보낸 퀴즈 문제 출력 (모든 사람에게 보여주고 싶으면 조건 제거)
            const myId = this.getMyId();
            const container = document.createElement("div");

            if(data.host === myId){
                document.getElementById("quiz").innerText = data.quiz;

                container.classList.add("msg-container", "system-message");

                toggleHostInputUI(false);
            }else{
                document.getElementById("quiz").innerText = "";
            }

            container.innerHTML = `문제가 생성되었습니다.`;
            this.msgArea.appendChild(container);
            this.msgArea.scrollTop = this.msgArea.scrollHeight;
            
        } else if(data.type === "quizCorrect") {
            // 정답 맞춤 알림 + 문제 출력
            const container = document.createElement("div");
            container.classList.add("msg-container", "system-message");
            container.innerHTML = `<i>정답입니다! "${data.username}"</i>`;
            this.msgArea.appendChild(container);
            this.msgArea.scrollTop = this.msgArea.scrollHeight;

            // 현재 문제 출력
            document.getElementById("quiz").innerText = data.quiz;
            clearAll();

            // 방장 변경은 서버가 hostChanged 메시지로 따로 보냄

        }
    }

    send(message){
        const fullMessage = JSON.stringify({type: "chat", username: this.username, message});
        this.websocket.send(fullMessage);
    }

    disconnect() {
    if (this.websocket) {
        // 이벤트 리스너 제거 (안전하게 종료)
        this.websocket.onopen = null;
        this.websocket.onclose = null;
        this.websocket.onmessage = null;

        if (this.websocket.readyState === WebSocket.OPEN || this.websocket.readyState === WebSocket.CONNECTING) {
            this.websocket.close(1000, "클라이언트에서 명시적으로 종료");
        }

        this.websocket = null;
    }
}

    getMyId(){
        return this.username;
    }

    sendQuizInput(quiz) {
        if(this.websocket && this.websocket.readyState === WebSocket.OPEN){
            const msg = {
                type: "quizInput",
                username: this.username,
                quiz: quiz
            };
            this.websocket.send(JSON.stringify(msg));
        }
    }
}