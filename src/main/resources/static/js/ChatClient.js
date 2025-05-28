class ChatClient{
    constructor({username, url, msgInputId, msgAreaId}){
        this.username = username;
        this.url = url;
        this.msgInput = document.getElementById(msgInputId);
        this.msgArea = document.getElementById(msgAreaId);
        this.websocket = null;

        this.init();
    }

    init(){
        this.websocket = new WebSocket(this.url);
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

    onOpen(){
        this.websocket.send(`${this.username} 님이 입장하셨습니다.`);
    }

    onClose(event){
        if(event.code === 1008){
            alert("접속 인원 초과로 입장이 불가능 합니다.");
        }else{
            alert("서버와의 연결이 종료되었습니다.");
        }
    }




// 캔버스 이벤트 전송 메서드 추가
    sendCanvasEvent(data) {
        if(this.websocket && this.websocket.readyState === WebSocket.OPEN){
            const message = JSON.stringify({ type: "canvas", username: this.username, ...data });
            this.websocket.send(message);
        }
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
        }
    }

    send(message){
        const fullMessage = JSON.stringify({type: "chat", username: this.username, message});
        this.websocket.send(fullMessage);
    }

    // onMessage(event){
    //     const [sessionId, ...msgParts] = event.data.split(":");
    //     const message = msgParts.join(":").trim();

    //     const isMyMessage = sessionId.trim() === this.username;

    //     // 메시지용 div를 새로 만듦
    //     const container = document.createElement("div");
    //     container.classList.add("msg-container");
    //     container.classList.add(isMyMessage ? "my-message" : "other-message");

    //     const content = document.createElement("div");
    //     content.classList.add("msg-content");
    //     content.innerHTML = `<b>${sessionId.trim()}</b><br>${message}`;

    //     container.appendChild(content);
    //     this.msgArea.appendChild(container);

    //     // const formatted = isMyMessage 
    //     //     ? `<b>${sessionId.trim()} <br> ${message}</b><br>`
    //     //     : `<b>${sessionId.trim()} <br> ${message}</b><br>`;

    //     // this.msgArea.insertAdjacentHTML("beforeend", formatted);

    //     //자동 스크롤
    //     this.msgArea.scrollTop = this.msgArea.scrollHeight;
    // }

    // send(message){
    //     const fullMessage = `${this.username} : ${message}`;
        
    //     this.websocket.send(fullMessage);
    // }

    sendSystemMessage(message){
        if(this.websocket && this.websocket.readyState === WebSocket.OPEN){
            this.websocket.send(`${this.username} : ${message}`);
        }
    }

    disconnect(){
        if(this.websocket){
            this.websocket.close();
        }
    }

}