
function login(){
    console.log("ajax 전송");

    $.ajax({
        type:"post",
        url:"http://localhost:8080/member/login",
        data:{
            id: $('#id').val(),
            password: $("#pw").val(),
        },
        dataType:"json",
        success:function(data){
            console.log(data);
        },
        error:function(e){
            console.log(e);
        }
    })
}

