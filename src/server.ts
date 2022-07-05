import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import { faker } from "@faker-js/faker";
import { ChatTypeEnum } from "./types";
require("dotenv").config();

const app = express();
app.use(cors());
const httpServer = createServer(app);
const PORT = process.env.PORT || 4203;

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_FRONT || "http://localhost:3000",
  },
});

let users: { id: string; name: string }[] = [];
let listTyping: { id: string; name: string }[] = [];

io.on("connection", (socket) => {
  console.log("connection id: ", socket.id);
  const newName = faker.name.findName();

  socket.on("guest.new", () => {
    users.push({ id: socket.id, name: newName });
    io.sockets.emit("guest.first", {
      name: newName,
      users: users.map((u) => u.name),
    });
    io.sockets.emit("guest.show", {
      name: newName,
    });
    io.sockets.emit("message.show", {
      sender: newName,
      text: "",
      date: new Date(),
      type: ChatTypeEnum.NEW,
    });
  });

  socket.on("message.new", ({ sender, text }) => {
    io.sockets.emit("message.show", {
      sender,
      text,
      date: new Date().toISOString(),
      type: ChatTypeEnum.MSG,
    });
    listTyping = listTyping.filter((l) => l.id !== socket.id);
    io.sockets.emit("typing.show", {
      listTyping: listTyping.map((l) => l.name),
    });
  });

  let timeout: NodeJS.Timeout;
  socket.on("typing.new", ({ name }) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (!listTyping.find(({ id }) => id === socket.id)) {
      listTyping.push({ id: socket.id, name });
    }
    io.sockets.emit("typing.show", {
      listTyping: listTyping.map((l) => l.name),
    });
    timeout = setTimeout(() => {
      listTyping = listTyping.filter((l) => l.id !== socket.id);
      io.sockets.emit("typing.show", {
        listTyping: listTyping.map((l) => l.name),
      });
    }, 4000);
  });

  socket.on("disconnect", () => {
    users = users.filter(({ id }) => id !== socket.id);
    io.sockets.emit("guest.exit", {
      name: newName,
    });
    io.sockets.emit("message.show", {
      sender: newName,
      text: "",
      date: new Date().toISOString(),
      type: ChatTypeEnum.EXIT,
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`listen :${PORT}`);
});
