const { Server } = require("socket.io");
const cookie = require('cookie')
const jwt = require('jsonwebtoken')
const userModel = require('../models/user.model')

// NOTE: Toggle between real and mock AI service:
// - For production/real API: use './ai.service'
// - For testing without quota issues: use './mock-ai.service'
const USE_MOCK_AI = process.env.USE_MOCK_AI === 'true' || false; // Set to true to use mock
const aiService = USE_MOCK_AI ? require('../services/mock-ai.service') : require('../services/ai.service');
const { generateContent, generateVector } = aiService;

const { processPayload } = require('../services/python.service')

const messageModel = require('../models/message.model')
const {createMemory, queryMemory} = require('../services/vector.service')

console.log("Final USE_MOCK_AI : ", USE_MOCK_AI)
console.log("Using AI Service : ", USE_MOCK_AI ? "MOCK" : "REAL")

async function initSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            // origin: ["http://localhost:5000", "http://localhost:5773", "http://localhost:3000", "http://localhost:5774"],
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
            transports: ['websocket', 'polling'] // Ensure both transports are enabled
        }
    })

    // Middleware for every Socket Connection
    io.use(async (socket, next) => { 
        try {
            console.log("Incoming handshake headers:", socket.handshake.headers); // <<< important debug
            
            const cookies = cookie.parse(socket.handshake.headers?.cookie || "")
            
            if(!cookies.token){
                return next(new Error("Authentication error: No token provided"))
            }
            const token = cookies.token

            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await userModel.findById(decoded.id);

            if (!user) {
                return next(new Error("Authentication error: User not found"));
            }

            socket.user = user
            next()
        } catch (error) {
            next(new Error("Authentication error: Invalid token"))
        }
    })

    // Connection event
    // io.on("connection", (socket) => { 
    //     console.log('User connected:', socket.user.email)
    //       console.log(">>> New connection id:", socket.id); 
    //       //console.log(">>> Handshake headers:", socket.handshake.headers);
    //       //console.log(">>> Handshake auth:", socket.handshake.auth); // if used
        
    //     socket.on('ai-message', async (rawMessage) => {
    //         console.log("RAW received (type):", typeof rawMessage, rawMessage);

    //         let message = rawMessage;
    //         if (typeof rawMessage === 'string') {
    //             try {
    //             message = JSON.parse(rawMessage);
    //             console.log("Parsed string -> object:", message);
    //             } catch (e) {
    //             console.log("ERROR: message string could not be JSON.parsed");
    //             socket.emit('error', { message: 'Invalid message format' });
    //             return;
    //             }
    //         }
    //         if (Buffer.isBuffer(rawMessage)) {
    //             // try to decode buffer
    //             try {
    //             message = JSON.parse(rawMessage.toString('utf8'));
    //             console.log("Parsed buffer -> object:", message);
    //             } catch (e) {
    //             console.log("ERROR: buffer could not be parsed");
    //             socket.emit('error', { message: 'Invalid message format' });
    //             return;
    //             }
    //         }

    //         // Add validation for message format
    //         if (!message || typeof message !== 'object') {
    //             console.log("ERROR: Invalid message format");
    //             socket.emit('error', { message: 'Invalid message format' });
    //             return;
    //         }

    //         if(!message.chat || !message.content){
    //             console.log("ERROR: Give chatID as chat along with content of message")
    //             socket.emit('error', { message: 'Missing chat ID or content' });
    //             return
    //         }

    //         try {
    //             // User req => storing to DB
    //             const reqMessage = await messageModel.create({
    //                 user: socket.user._id,
    //                 chat: message.chat,
    //                 content: message.content,
    //                 role: "user"
    //             })

    //             const requestVectors = await generateVector(message.content)
                
    //             const memory = await queryMemory({
    //                 queryVector: requestVectors,
    //                 limit: 3,
    //                 metadata: {}
    //             })

    //             await createMemory({
    //                 vectors: requestVectors,
    //                 metadata: {
    //                     chat: message.chat,
    //                     user: socket.user._id,
    //                     text: message.content
    //                 },
    //                 messageId: reqMessage._id
    //             })

    //             // Get chat history
    //             const chatHistory = (await messageModel.find({
    //                 chat: message.chat
    //             }).sort({createdAt: -1})
    //             .limit(20)
    //             .lean())
    //             .reverse()

    //             // Generate AI response
    //             const response = await generateContent(
    //                 chatHistory.map(item => ({
    //                     role: item.role,
    //                     content: item.content
    //                 }))
    //             );

    //             // AI res => storing to DB
    //             const resMessage = await messageModel.create({
    //                 user: socket.user._id,
    //                 chat: message.chat,
    //                 content: response,
    //                 role: "model"
    //             })

    //             //const responseVectors = await generateVector(response)

    //             await createMemory({
    //                 // vectors: responseVectors,
    //                 vectors: Array(768).fill(0.1),
    //                 metadata: {
    //                     chat: resMessage.chat,
    //                     user: socket.user._id,
    //                     text: response
    //                 },
    //                 messageId: resMessage._id
    //             })

    //             // Send response back to user
    //             socket.emit('ai-response', {
    //                 content: response,
    //                 chat: message.chat
    //             })
    //         } catch (error) {
    //             console.error("Error processing message:", error)
    //             socket.emit('error', { message: 'Failed to process message' })
    //         }
    //     })

        
    //     socket.on('disconnect', (reason) => {
    //         console.log('User disconnected:', socket.user.email, 'Reason:', reason)
    //     })
    // })

    io.on("connection", (socket) => {
        console.log("✅ User connected:", socket.user?.email, "ID:", socket.id);

socket.on('ai-message', async (rawMessage) => {
  console.log("📩 Received message:", typeof rawMessage, rawMessage);

  // parse if string/buffer
  let message = rawMessage;
  if (typeof rawMessage === 'string') {
    try { message = JSON.parse(rawMessage); } catch (e) { socket.emit('ai-error', { message: 'Invalid message JSON' }); return; }
  } else if (Buffer.isBuffer(rawMessage)) {
    try { message = JSON.parse(rawMessage.toString('utf8')); } catch (e) { socket.emit('ai-error', { message: 'Invalid message JSON' }); return; }
  }

  if (!message || typeof message !== 'object') { socket.emit('ai-error', { message: 'Invalid message format' }); return; }
  if (!message.chat || !message.content) { socket.emit('ai-error', { message: 'Missing chat ID or content' }); return; }

  try {
    // 1) Save user message to DB
    const reqMessage = await messageModel.create({
      user: socket.user._id,
      chat: message.chat,
      content: message.content,
      role: "user",
    });

    // 2) Generate embedding (safe)
    const requestVectors = await generateVector(message.content);
    if (requestVectors) {
      // only query memory & save if we have a valid vector
      const memory = await queryMemory({
        queryVector: requestVectors,
        limit: 3,
        metadata: {},
      });

      await createMemory({
        vectors: requestVectors,
        metadata: {
          chat: message.chat,
          user: socket.user._id,
          text: message.content,
        },
        messageId: reqMessage._id,
      });
    } else {
      console.warn("Embedding failed — skipping queryMemory/createMemory for user message.");
    }
    // for changing chat history ==> backend -> src -> socket.server.js ==> (i.e. how many previous request and responses it will Remmeber while giving response for giving Response for current one)
    // 3) Build chat history (use the most recent 3-5 messages to reduce API usage)
    const chatHistory = (await messageModel.find({ chat: message.chat }).sort({ createdAt: -1 }).limit(4).lean()).reverse();

    // 4) Send the incoming message through the Python processing service
    const pythonResult = await processPayload({
      user: {
        id: socket.user._id.toString(),
        email: socket.user.email,
      },
      chat: message.chat,
      content: message.content,
      history: chatHistory.map((item) => ({
        role: item.role,
        content: item.content,
        createdAt: item.createdAt,
      })),
    });

    const processedContent = (() => {
      if (!pythonResult || pythonResult.error) {
        return message.content;
      }
      if (typeof pythonResult.processed === 'string') {
        return pythonResult.processed;
      }
      if (pythonResult.processed && typeof pythonResult.processed.content === 'string') {
        return pythonResult.processed.content;
      }
      if (pythonResult.original && typeof pythonResult.original.content === 'string') {
        return pythonResult.original.content;
      }
      return JSON.stringify(pythonResult.processed || pythonResult.original || message.content);
    })();

    if (processedContent !== message.content) {
      console.log('✅ Python processed user message:', processedContent);
    }

    const historyForAI = chatHistory.map((item) =>
      item._id.toString() === reqMessage._id.toString()
        ? { ...item, content: processedContent }
        : item
    );

    // 5) Generate AI text (always try — use the processed user prompt when available)
    const response = await generateContent(historyForAI.map((item) => ({ role: item.role, content: item.content })));
    const resMessage = await messageModel.create({
      user: socket.user._id,
      chat: message.chat,
      content: response,
      role: "model",
    });

    // 5) Try to embed AI response — if embedding fails, skip upsert
    const responseVectors = await generateVector(response);
    if (responseVectors) {
      await createMemory({
        vectors: responseVectors,
        metadata: {
          chat: resMessage.chat,
          user: socket.user._id,
          text: response,
        },
        messageId: resMessage._id,
      });
    } else {
      console.warn("Embedding for AI response failed — skipping storing AI vector.");
    }

    // 6) Emit response to client
    socket.emit('ai-response', { content: response, chat: message.chat });
  } catch (err) {
    console.error("🔥 Server-side error while processing message:", err?.message || err);
    socket.emit('ai-error', { message: 'Failed to process message', details: err?.message });
  }
});

        socket.on("disconnect", (reason) => {
            console.log("❌ User disconnected:", socket.user?.email, "Reason:", reason);
        });
    });

}

module.exports = initSocketServer