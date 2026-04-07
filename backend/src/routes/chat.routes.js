const express = require('express')
const { authUser } = require('../middlewares/auth.middleware')
const { createChat, getChats, getChatMessages } = require('../controllers/chat.controller')

const router = express.Router();

router.post('/', authUser, createChat)
router.get('/', authUser, getChats) // New endpoint to get all chats for a user
router.get('/:chatId/messages', authUser, getChatMessages) // New endpoint to get messages for a specific chat

module.exports = router