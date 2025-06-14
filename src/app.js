import express from "express";
import logger from "morgan";
import path from "path";

import http from "http";
import debugModule from "debug";
const debug = debugModule("fish-app:server");

import compression from "compression";

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

import io from "./io.js";

const app = express();
const port = 3000;

debug.enabled = true;

import registerGameHandlers from "./gameHandler.js";

const onConnection = (socket) => {
  registerGameHandlers(io, socket);
};

const onSocketError = (err) => {
  console.log("error with socket io:", err);
};

io.on("connection", onConnection);

io.on("error", onSocketError);

app.use(compression())
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(path.dirname(__dirname), "public")));
app.use(
  express.static(path.join(path.dirname(__dirname), "public/images/favicons"))
);

app.set("port", port);
const server = http.createServer(app);

server.listen(port);
server.on("listening", onListening);

io.attach(server);

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}
