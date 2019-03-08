var mongoose=require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: String,
    avatar: String,
    firstName: String,
    lastName: String,
    about: String,
    email: {type: String, unique: true, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    /*Adding admin privilegies*/
    isAdmin: {type: Boolean, default: false},
    id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
})

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);