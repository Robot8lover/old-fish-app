import express from "express";
import logger from "morgan";
import io from "io";

const app = express();
const port = 3000;

io.on("connection", (socket) => {
})

io.on('error', (err) => {
  console.log('error with socket io:', err);
});


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Hello, Express!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});