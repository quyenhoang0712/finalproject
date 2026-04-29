const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "teacher", "admin", "parent"],
      required: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    caption: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
