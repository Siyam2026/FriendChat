import express from 'express';
import Message from '../models/Message.ts';
import { authMiddleware } from '../middleware/auth.ts';

const router = express.Router();

router.get('/:receiverId', authMiddleware, async (req: any, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user.id;

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
