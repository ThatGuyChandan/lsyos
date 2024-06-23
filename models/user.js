const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 4, trim: true },
  username: {
    type: String,
    required: true,
    minlength: 4,
    unique: true,
    trim: true,
  },
  password: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/.+\@.+\..+/, "Please fill a valid email address"],
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{10}$/, "Please fill a valid mobile number"],
  },
  petroleumName: {
    type: String,
    required: true,
    minlength: 4,
    trim: true,
  },
  location: { type: String, required: true, trim: true },
});
const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
