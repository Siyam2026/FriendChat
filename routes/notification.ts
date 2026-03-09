import express from 'express';
import Notification from '../models/Notification.ts';
import { authMiddleware } from '../middleware/auth.ts';

const router = express.Router();

router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('senderId', 'name profilePicture')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/markRead', authMiddleware, async (req: any, res) => {
    try {
        await Notification.updateMany({ userId: req.user.id, status: 'pending' }, { status: 'read' });
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
