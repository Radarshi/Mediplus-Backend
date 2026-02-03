import mongoose from "mongoose";
import { initBlogConnection } from "../db/connections.js";

const blogSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: "User",
    required: true
  },
  featured:{
    type: Boolean,
    default: false
  },
  author:{
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true
  },
  excerpt:{
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    default: []
  },
  date:{
    type: String
  },
  category: {
    type: String,
    default: 'Others'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
},
{timeStamps:true});

export async function getBlogModel() {
  const connection = await initBlogConnection();
  return connection.model("Blog", blogSchema);
}
