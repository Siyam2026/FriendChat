import express from 'express';
import User from '../models/User.ts';
import Friend from '../models/Friend.ts';
import Notification from '../models/Notification.ts';
import { authMiddleware } from '../middleware/auth.ts';

const router = express.Router();

router.get('/searchUser', authMiddleware, async (req: any, res) => {
  try {
    const { name } = req.query;
    const users = await User.find({
      name: { $regex: name, $options: 'i' },
      _id: { $ne: req.user.id }
    }).select('name profilePicture onlineStatus');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/sendRequest', authMiddleware, async (req: any, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    const existingRequest = await Friend.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existingRequest) return res.status(400).json({ message: 'Request already exists or already friends' });

    const friendRequest = new Friend({ sender: senderId, receiver: receiverId });
    await friendRequest.save();

    const notification = new Notification({
      userId: receiverId,
      senderId: senderId,
      message: `${req.user.name} sent you a friend request`,
      type: 'friend_request'
    });
    await notification.save();

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/respondRequest', authMiddleware, async (req: any, res) => {
  try {
    const { senderId, status } = req.body; 
    const friendRequest = await Friend.findOne({
        sender: senderId,
        receiver: req.user.id,
        status: 'pending'
    });

    if (!friendRequest) return res.status(404).json({ message: 'Request not found' });

    friendRequest.status = status;
    await friendRequest.save();

    const sender = await User.findById(req.user.id);

    if (status === 'rejected') {
        const notification = new Notification({
            userId: friendRequest.sender,
            senderId: req.user.id,
            message: `${sender.name} rejected your friend request`,
            type: 'system'
        });
        await notification.save();
    } else {
        const notification = new Notification({
            userId: friendRequest.sender,
            senderId: req.user.id,
            message: `${sender.name} accepted your friend request`,
            type: 'system'
        });
        await notification.save();
    }

    // Update notification status
    await Notification.findOneAndUpdate(
        { senderId: friendRequest.sender, userId: req.user.id, type: 'friend_request' },
        { status: status }
    );

    res.json({ message: `Request ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/friends', authMiddleware, async (req: any, res) => {
  try {
    const friends = await Friend.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
      status: 'accepted'
    }).populate('sender receiver', 'name profilePicture onlineStatus');

    const friendList = friends.map(f => {
      return f.sender._id.toString() === req.user.id ? f.receiver : f.sender;
    });

    res.json(friendList);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
