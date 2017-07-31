const socket = io();

$('.access').click(function(){
    socket.emit($(this).val());
});