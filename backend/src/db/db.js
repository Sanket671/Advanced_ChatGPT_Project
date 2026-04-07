const mongoose = require('mongoose')

async function connectDB(){
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("connected to DB")
    } catch (error) {
        console.error('Error connecting to DB : ', error)
    }
}

module.exports = connectDB