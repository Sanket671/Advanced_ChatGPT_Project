const express = require('express')
const {registerController, loginController, checkAuthController} = require('../controllers/auth.controller')
const { authUser } = require('../middlewares/auth.middleware')

const router = express.Router()

router.post('/register', registerController)
router.post('/login', loginController)
router.get('/check', authUser, checkAuthController) // New endpoint for checking authentication

module.exports = router