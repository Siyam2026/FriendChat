import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Message', MessageSchema);
