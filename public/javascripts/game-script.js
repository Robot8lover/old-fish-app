const socket = io();

socket.on('news', (data) => {
  console.log(data);
  socket.emit('my other event', { my: 'data' });
});