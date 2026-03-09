import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['friend_request', 'message', 'system'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'read'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Notification', NotificationSchema);
