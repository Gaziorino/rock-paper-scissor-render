
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const __dirname = __dirname;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "view")));
app.use(express.static(path.join(__dirname, "images")));

app.get("/", (req, res, next) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

let room = [];

io.on("connection", (socket) => {
  console.log("client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on("createRoom", (roomID) => {
    room[roomID] = { p1Choice: null, p1Score: 0 };
    socket.join(roomID);
    socket.to(roomID).emit("playersConnected", { roomID: roomID });
  });

  socket.on("joinRoom", (roomID) => {
    if (!io.sockets.adapter.rooms.has(roomID)) {
      return socket.emit("Not a ValidToken");
    }

    const roomSize = io.sockets.adapter.rooms.get(roomID).size;
    if (roomSize > 1) {
      return socket.emit("roomFull");
    }

    if (io.sockets.adapter.rooms.has(roomID)) {
      socket.join(roomID);
      room[roomID].p2Choice = null;
      room[roomID].p2Score = 0;

      socket.to(roomID).emit("playersConnected");
      return socket.emit("playersConnected");
    }
  });

  socket.on("p1Choice", (data) => {
    if (data) {
      const choice = data.rpschoice;
      const roomID = data.roomID;
      room[roomID].p1Choice = choice;
      socket
        .to(roomID)
        .emit("p1Choice", { rpsValue: choice, score: room[roomID].p1Score });
      if (room[roomID].p2Choice) {
        return declareWinner(roomID);
      }
    }
  });

  socket.on("p2Choice", (data) => {
    if (data) {
      const choice = data.rpschoice;
      const roomID = data.roomID;
      room[roomID].p2Choice = choice;
      socket
        .to(roomID)
        .emit("p2Choice", { rpsValue: choice, score: room[roomID].p2Score });
      if (room[roomID].p1Choice) {
        return declareWinner(roomID);
      }
    }
  });

  socket.on("playerClicked", (data) => {
    const roomID = data.roomID;
    room[roomID].p1Choice = null;
    return socket.to(roomID).emit("playAgain");
  });

  socket.on("exitGame", (data) => {
    const roomID = data.roomID;
    if (data.player) {
      socket.to(roomID).emit("player1Left");
    } else {
      socket.to(roomID).emit("player2Left");
    }
    return socket.leave(roomID);
  });
});

const declareWinner = (roomID) => {
  let winner;
  const r = room[roomID];

  if (r.p1Choice == r.p2Choice) {
    winner = "draw";
  } else if (r.p1Choice == "rock") {
    winner = r.p2Choice == "scissor" ? "p1" : "p2";
  } else if (r.p1Choice == "paper") {
    winner = r.p2Choice == "scissor" ? "p2" : "p1";
  } else if (r.p1Choice == "scissor") {
    winner = r.p2Choice == "rock" ? "p2" : "p1";
  }

  return io.sockets.to(roomID).emit("winner", winner);
};

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
