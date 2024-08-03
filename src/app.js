import express from "express";
import logger from "morgan";
import path from "path";

import http from "http";
import debugModule from "debug";
const debug = debugModule("fish-app:server");

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

import io from "./io.js";

const app = express();
const port = 3000;

debug.enabled = true;

io.on('connection', (socket) => {
  debug('a user connected');

  socket.emit('news', { hello: 'world' });
  socket.on('my other event', (data) => {
    debug(data);
  });
});

io.on('error', (err) => {
  debug('error with socket io:', err);
});


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(path.dirname(__dirname), 'public')));



app.set("port", port);
const server = http.createServer(app);

server.listen(port);
server.on('listening', onListening);

io.attach(server)

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}