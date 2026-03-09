import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Models
import User from './models/User.ts';
import Message from './models/Message.ts';

// Routes
import authRoutes from './routes/auth.ts';
import friendRoutes from './routes/friend.ts';
import messageRoutes from './routes/message.ts';
import notificationRoutes from './routes/notification.ts';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://siyam:Tl5YsFUapfZrSjnN@cluster0.uh8byi7.mongodb.net/friendChat?appName=Cluster0';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/friend', friendRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/notification', notificationRoutes);

// Socket.io logic
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('userOnline', async (userId) => {
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { onlineStatus: true });
    io.emit('updateStatus', { userId, status: true });
  });

  socket.on('sendMessage', async (data) => {
    const { senderId, receiverId, text, image } = data;
    const newMessage = new Message({ senderId, receiverId, text, image });
    await newMessage.save();

    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receiveMessage', newMessage);
    }
    // Also send back to sender for confirmation/sync if needed, 
    // but usually client adds it optimistically.
  });

  socket.on('typing', (data) => {
    const { senderId, receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', { senderId });
    }
  });

  socket.on('stopTyping', (data) => {
    const { senderId, receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('stopTyping', { senderId });
    }
  });

  socket.on('disconnect', async () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      await User.findByIdAndUpdate(disconnectedUserId, { onlineStatus: false });
      io.emit('updateStatus', { userId: disconnectedUserId, status: false });
    }
    console.log('User disconnected');
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Fallback for SPA
  app.get('*', (req, res) => {
    // If it's not an API call, serve the home page or login page
    // For simplicity, we'll just serve index.html which will handle routing or redirect
    res.sendFile(path.resolve(__dirname, 'public', 'pages', 'login.html'));
  });

  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch(err => console.error('MongoDB connection error:', err));
}

startServer();
