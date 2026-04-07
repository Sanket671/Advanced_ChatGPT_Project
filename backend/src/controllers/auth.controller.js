const userModel = require('../models/user.model')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

async function registerController(req, res) {
    const { fullName: { firstName, lastName }, email, password } = req.body;

    try {
        const userExists = await userModel.findOne({
            email: email
        })
        if (userExists) {
            return res.status(400).json({
                message: "User already Exists"
            })
        }

        const hashPassword = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            fullName: { firstName, lastName },
            email: email,
            password: hashPassword
        })

        const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET)

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        })

        res.status(201).json({
            message: "User registered Successfully",
            user: {
                email: user.email,
                id: user._id,
                fullName: user.fullName,
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}

async function loginController(req, res) {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(401).json({
                message: "Invalid Credential - email"
            })
        }
        const isValidPass = await bcrypt.compare(password, user.password);
        if (!isValidPass) {
            return res.status(401).json({
                message: "Invalid Credential - password"
            })
        }
        const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET)
        
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        })

        res.status(200).json({
            message: "Logged in Successfully",
            token,
            user: {
                email: user.email,
                id: user._id,
                fullName: user.fullName,
            }
        })
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" })
    }
}

// New function to check authentication status
async function checkAuthController(req, res) {
    try {
        res.status(200).json({
            user: {
                email: req.user.email,
                id: req.user._id,
                fullName: req.user.fullName,
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server error" })
    }
}

module.exports = { registerController, loginController, checkAuthController }
