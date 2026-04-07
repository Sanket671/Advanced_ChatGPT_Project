// test-socket.js
const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4ZTI2ZWQ0NmQ3MzE1ZTg4ODZmNGY2NCIsImlhdCI6MTc1OTY3MDA5OH0.J-Zkxpxg-_NaDpiH8yq57QIAurbHKMdR7zP77S0wmdg";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],          // force websocket transport
  reconnectionDelayMax: 10000,
  extraHeaders: { Cookie: `token=${TOKEN}` } // Node client can set Cookie header
});

socket.on("connect", () => {
  console.log("Connected to backend!");
  socket.emit("ai-message", {
    chat: "68b99f1594c5a111a1253b28",
    content: "Who is Rajeev Gandhi?"
  });
});

socket.on("ai-response", (data) => {
  console.log("AI Response:", data);
});

socket.on("error", (err) => {
  console.error("Socket Error:", err);
});

socket.on("connect_error", (err) => {
  console.error("connect_error:", err.message || err);
});
