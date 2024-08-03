import { Server } from 'socket.io';

const io = new Server();

const attach = io.attach;
io.onAttach = undefined;
io.attach = function(...args) {
  attach.apply(io, args);
  if (io.onAttach) {
    io.onAttach();
  }
};

export default io;
