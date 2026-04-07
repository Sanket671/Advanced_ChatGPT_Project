const chatModel = require('../models/chat.model')
const messageModel = require('../models/message.model')

async function createChat(req, res) {
    try {
        const { title } = req.body
        const user = req.user
        const chat = await chatModel.create({
            user: user._id,
            title: title
        })

        res.status(201).json({
            message: "Chat created Successfully",
            chat: {
                _id: chat._id,
                title: chat.title,
                lastActivity: chat.lastActivity,
                user: chat.user
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}

// New function to get all chats for a user
async function getChats(req, res) {
    try {
        const user = req.user
        const chats = await chatModel.find({ user: user._id }).sort({ lastActivity: -1 })
        
        res.status(200).json({
            chats: chats.map(chat => ({
                _id: chat._id,
                title: chat.title,
                lastActivity: chat.lastActivity,
                user: chat.user
            }))
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}

// New function to get messages for a specific chat
async function getChatMessages(req, res) {
    try {
        const { chatId } = req.params
        const messages = await messageModel.find({ chat: chatId }).sort({ createdAt: 1 })
        
        res.status(200).json({
            messages: messages.map(message => ({
                _id: message._id,
                content: message.content,
                role: message.role,
                createdAt: message.createdAt
            }))
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}

module.exports = { createChat, getChats, getChatMessages }