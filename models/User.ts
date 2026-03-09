import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' },
  onlineStatus: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
