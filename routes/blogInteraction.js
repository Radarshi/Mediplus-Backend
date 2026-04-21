// routes/blogInteraction.js
import express from 'express';
import { createBlog, getAllBlogs, getBlogById } from '../models/blogs.js';
import { findUserByEmail } from '../models/user.js';

const router = express.Router();

// GET /api/blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await getAllBlogs();
    res.json(blogs);
  } catch (err) {
    console.error('Error fetching blogs:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/blogs/:id
router.get('/:id', async (req, res) => {
  try {
    const blog = await getBlogById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json(blog);
  } catch (err) {
    console.error('Error fetching blog:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/blogs
router.post('/', async (req, res) => {
  try {
    const { featured, author, title, email, content, category, tags } = req.body;

    if (!author || !title || !content || !category) {
      return res.status(400).json({ error: 'Author, title, content and category are required' });
    }

    const user   = await findUserByEmail(email);
    const userId = user?.userId ?? 'GUEST';

    const blog = await createBlog({
      userId,
      featured: featured ?? false,
      author,
      title,
      email,
      excerpt: content.slice(0, 120) + '...',
      content,
      tags:     tags ?? [],
      category,
    });

    res.status(201).json(blog);
  } catch (err) {
    console.error('Error posting blog:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;