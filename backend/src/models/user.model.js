const mongoose = require('mongoose')

const userScehma = new mongoose.Schema({   // User Login & Register
    email : {
        type : String,
        required : true,
        unique : true
    }, fullName : {
        firstName : {
            type : String,
            required : true
        }, lastName : {
            type : String,
            required : true
        }
    }, password : {
        type : String,
    }
    
}, {timestamps : true})

const userModel = mongoose.model("user", userScehma) // for user model, Collection name : users(plural)

module.exports = userModel
