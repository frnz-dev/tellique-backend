const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tellique', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB successfully!');
});

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    profilePic: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Message Schema with reactions
const messageSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        default: 'Anonymous'
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    reaction: {
        type: String,
        default: ''
    },
    senderAvatar: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Helper function to get user profile pic
const getUserProfilePic = async (username) => {
    try {
        const user = await User.findOne({ username });
        return user ? user.profilePic : '';
    } catch (error) {
        return '';
    }
};

// Routes

// Health check
app.get('/', (req, res) => {
    res.json({ 
        message: 'Tellique Backend API is running!',
        version: '1.0.0',
        endpoints: [
            'POST /api/users/signup',
            'POST /api/users/login',
            'GET /api/users/profile/:username',
            'PUT /api/users/profile/:username',
            'POST /api/messages',
            'GET /api/messages/inbox/:username',
            'GET /api/messages/sent/:username',
            'PATCH /api/messages/:messageId/react'
        ]
    });
});

// User Registration
app.post('/api/users/signup', async (req, res) => {
    try {
        const { username, password, profilePic } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters long' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            username: username.toLowerCase(),
            password: hashedPassword,
            profilePic: profilePic || ''
        });

        await newUser.save();

        res.status(201).json({ 
            message: 'User created successfully',
            username: newUser.username
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error during signup' });
    }
});

// User Login
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({ 
            message: 'Login successful',
            username: user.username,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

// Get User Profile
app.get('/api/users/profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({ username: username.toLowerCase() }).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            username: user.username,
            profilePic: user.profilePic,
            createdAt: user.createdAt
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update User Profile
app.put('/api/users/profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { profilePic } = req.body;

        const user = await User.findOneAndUpdate(
            { username: username.toLowerCase() },
            { profilePic },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            message: 'Profile updated successfully',
            profilePic: user.profilePic
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send Message/Confession
app.post('/api/messages', async (req, res) => {
    try {
        const { from, to, nickname, content } = req.body;

        if (!from || !to || !content) {
            return res.status(400).json({ error: 'From, to, and content are required' });
        }

        if (content.length > 1000) {
            return res.status(400).json({ error: 'Message too long (max 1000 characters)' });
        }

        // Check if recipient exists
        const recipient = await User.findOne({ username: to.toLowerCase() });
        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        // Get sender's avatar
        const senderAvatar = await getUserProfilePic(from);

        const newMessage = new Message({
            from: from.toLowerCase(),
            to: to.toLowerCase(),
            nickname: nickname || 'Anonymous',
            content,
            senderAvatar
        });

        await newMessage.save();

        res.status(201).json({ 
            message: 'Confession sent successfully',
            id: newMessage._id
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Inbox Messages
app.get('/api/messages/inbox/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ to: username.toLowerCase() })
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);

        // Format dates
        const formattedMessages = messages.map(msg => ({
            ...msg.toObject(),
            date: msg.date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

        res.json(formattedMessages);

    } catch (error) {
        console.error('Get inbox error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Sent Messages
app.get('/api/messages/sent/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ from: username.toLowerCase() })
            .sort({ date: -1 })
            .limit(limit)
            .skip(skip);

        // Format dates
        const formattedMessages = messages.map(msg => ({
            ...msg.toObject(),
            date: msg.date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }));

        res.json(formattedMessages);

    } catch (error) {
        console.error('Get sent messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add/Update Reaction to Message
app.patch('/api/messages/:messageId/react', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { reaction } = req.body;

        if (!reaction) {
            return res.status(400).json({ error: 'Reaction is required' });
        }

        // Validate reaction (basic emoji check)
        const validReactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯'];
        if (!validReactions.includes(reaction)) {
            return res.status(400).json({ error: 'Invalid reaction' });
        }

        const message = await Message.findByIdAndUpdate(
            messageId,
            { reaction },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json({ 
            message: 'Reaction updated successfully',
            reaction: message.reaction
        });

    } catch (error) {
        console.error('React to message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete Message (optional feature)
app.delete('/api/messages/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { username } = req.body; // The user requesting deletion

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Only allow sender or recipient to delete
        if (message.from !== username.toLowerCase() && message.to !== username.toLowerCase()) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }

        await Message.findByIdAndDelete(messageId);
        res.json({ message: 'Message deleted successfully' });

    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get User Stats (optional feature)
app.get('/api/users/:username/stats', async (req, res) => {
    try {
        const { username } = req.params;

        const [sentCount, receivedCount, user] = await Promise.all([
            Message.countDocuments({ from: username.toLowerCase() }),
            Message.countDocuments({ to: username.toLowerCase() }),
            User.findOne({ username: username.toLowerCase() }).select('-password')
        ]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            username: user.username,
            sentMessages: sentCount,
            receivedMessages: receivedCount,
            profilePic: user.profilePic,
            joinDate: user.createdAt
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
});

module.exports = app;