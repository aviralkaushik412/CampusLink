const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    process.env.FRONTEND_URL || "https://your-app-name.netlify.app"
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

// MongoDB connection with retry logic
const connectDB = async (retries = 5) => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('✅ MongoDB connected successfully');
    } catch (err) {
        if (retries > 0) {
            console.log(`MongoDB connection failed. Retrying... (${retries} attempts left)`);
            setTimeout(() => connectDB(retries - 1), 5000);
        } else {
            console.error('❌ MongoDB connection failed after all retries:', err);
            process.exit(1);
        }
    }
};

connectDB();

mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

const authenticateSocket = (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.user = decoded;
        next();
    });
};

io.use(authenticateSocket);

// Add authentication middleware for protected routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Update image upload endpoint to use dynamic URL
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const baseUrl = process.env.NODE_ENV === 'production' 
            ? process.env.SERVER_URL 
            : `http://localhost:${process.env.PORT || 3000}`;

        const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
        res.json({ url: imageUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

// Track connected users
let connectedUsers = new Set();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);
    connectedUsers.add(socket.user.username);
    io.emit('active users', connectedUsers.size);
    
    // Load existing messages
    Message.find()
        .sort({ timestamp: -1 })
        .limit(150)
        .then(messages => {
            socket.emit('load messages', messages.reverse());
        })
        .catch(err => console.error('Error loading messages:', err));

    // Handle new messages
    socket.on('chat message', async (messageData) => {
        try {
            // Create new message with the authenticated user's username
            const message = new Message({
                text: messageData.text,
                username: socket.user.username,
                timestamp: new Date(),
                type: messageData.type || 'text',
                url: messageData.url
            });
            
            // Save to database
            const savedMessage = await message.save();
            
            // Broadcast to all clients including sender
            io.emit('chat message', {
                _id: savedMessage._id,
                text: savedMessage.text,
                username: savedMessage.username,
                timestamp: savedMessage.timestamp,
                type: savedMessage.type,
                url: savedMessage.url
            });
            
            console.log(`Message from ${socket.user.username}: ${messageData.text}`);
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', { message: 'Error sending message' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.username}`);
        connectedUsers.delete(socket.user.username);
        io.emit('active users', connectedUsers.size);
    });
});

app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            return res.status(400).json({
                error: existingUser.email === email ? 'Email already exists' : 'Username already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ email, username, password: hashedPassword });
        await user.save();
 
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }

        const token = jwt.sign({ id: user._id, username, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ message: 'User registered', token, username });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
        }
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user || !await bcrypt.compare(password, user.password)) {

            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, username: user.username, email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, username: user.username });

    } catch (error) {

        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(150);
        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add a health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});