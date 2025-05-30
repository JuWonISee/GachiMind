class CanvasApp{
    constructor(canvasId, rangeId, chatClient){
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.rect = this.canvas.getBoundingClientRect();
        this.pos = {
            drawable : false,
            x : -1,
            y : -1
        };

        this.chatClient = chatClient;
        
        this.initEvents();

        if(rangeId){ this.initRange(rangeId); }
    }
    
    //화면 사이즈 변경시 그려지는 좌표 변경
    setRect(){
        this.rect = this.canvas.getBoundingClientRect();
    }

    initRange(rangeId){
        const range = document.getElementById(rangeId);

        if(range){
            range.addEventListener("input", () => {
                const width = parseFloat(range.value);
                this.setLinewidth(width);
            });
        } 
    }

    initEvents(){
        const events = [
            "mousedown", "mousemove", "mouseup", "mouseout",
            "touchstart", "touchmove", "touchend"
        ];

        events.forEach(event => {
            this.canvas.addEventListener(event, this.listener.bind(this));
        });
    }

    listener(e) {
        switch (e.type) {
            case "mousedown" : this.drawStart(e);                    break;
            case "mousemove" : if (this.pos.drawable) this.draw(e);  break;
            case "mouseup"   :
            case "mouseout"  : this.drawEnd(e);                      break;
            case "touchstart": this.touchStart(e);                   break;
            case "touchmove" : if (this.pos.drawable) this.touch(e); break;
            case "touchend"  : this.drawEnd(e);                      break;
        }
    }

    drawStart(e) {
        this.pos.drawable = true;
        this.pos.x = e.clientX - this.rect.left;
        this.pos.y = e.clientY - this.rect.top;



        //추가한거임
        this.ctx.beginPath();
        this.ctx.moveTo(this.pos.x, this.pos.y);

        if(this.chatClient){
            this.chatClient.sendCanvasEvent({
                action: "start",
                x: this.pos.x,
                y: this.pos.y,
                color: this.ctx.strokeStyle,
                lineWidth: this.ctx.lineWidth
            });
        }
    }

    draw(e) {
        let x = e.clientX - this.rect.left;
        let y = e.clientY - this.rect.top;
        this.ctx.beginPath();
        this.ctx.moveTo(this.pos.x, this.pos.y);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        //추가한거임
        if(this.chatClient){
            this.chatClient.sendCanvasEvent({
                action: "draw",
                x,
                y
            });
        }

        this.pos.x = x;
        this.pos.y = y;
    }

    drawEnd(e) {
        // this.pos.drawable = false; 원래꺼

        //추가한거임
        if(this.pos.drawable){
            this.pos.drawable = false;
            if(this.chatClient){
                this.chatClient.sendCanvasEvent({ action: "end" });
            }
        }
    }

    // 수신 이벤트를 처리할 메서드 추가 (다른 유저가 보낸 이벤트 반영)
    processRemoteCanvasEvent(data){
        switch(data.action){
            case "start":
                this.ctx.beginPath();
                this.ctx.strokeStyle = data.color;
                this.ctx.lineWidth = data.lineWidth;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.moveTo(data.x, data.y);
                this.pos.x = data.x;
                this.pos.y = data.y;
                break;
            case "draw":
                this.ctx.lineTo(data.x, data.y);
                this.ctx.stroke();
                this.pos.x = data.x;
                this.pos.y = data.y;
                break;
            case "clear":
                this.clearAll();
            case "end":
                // 현재는 특별한 처리 없음
                break;
        }
    }

    touchStart(e) {
        const touch = e.touches[0];
        this.pos.drawable = true;
        this.pos.x = touch.clientX - this.rect.left;
        this.pos.y = touch.clientY - this.rect.top;
    }

    touch(e) {
        const touch = e.touches[0];
        let x = touch.clientX - this.rect.left;
        let y = touch.clientY - this.rect.top;
        this.ctx.beginPath();
        this.ctx.moveTo(this.pos.x, this.pos.y);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.pos.x = x;
        this.pos.y = y;
    }

    setColor(color){
        this.ctx.strokeStyle = color;
    }

    setCursor(color){
        if(color == "white"){
            this.canvas.style.cursor = "url('../image/eraserCursor.png') 5 0, auto";
        }else{
            this.canvas.style.cursor = "url('../image/pencil.png'), auto";
        }
    }

    clearAll(){
        this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    }

    setLinewidth(width){
        this.ctx.lineWidth = width * 10;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
}