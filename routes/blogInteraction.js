import express from "express";
import { getBlogModel } from "../models/blogs.js";
import User from '../models/user.js';

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const Blog = await getBlogModel();
    const blogs = await Blog.find().sort({createdAt:-1});
    res.json(blogs);
  } catch (err) {
    console.error("Error while fetching blogs",err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const Blog = await getBlogModel();
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  } catch (err) {
    console.error("Error in fetching blogs",err);
    res.status(500).json({ error: err.message });
  }
});

// POST a new blog
router.post("/", async (req, res) => {
  console.log(req.body);
  try {
    const Blog = await getBlogModel();
    const { featured,author,title,email,content,category,tags } = req.body;
    console.log(req.body);

    const user = await User.findOne({email});
    if (!author || !title || !content || !category) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const newBlog = new Blog({
      userId: user.userId,
      featured,
      author,
      title,
      email,
      excerpt:content.slice(0,120) + '...',
      content,
      tags,
      date: new Date().toLocaleDateString(),
      category
      });

    const savedBlog = await newBlog.save();
    res.status(201).json(savedBlog);
  } catch (err) {
    console.error("Error while posting the form",err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
