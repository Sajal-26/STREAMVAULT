const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { User, Otp } = require('./models');

const app = express();
const PORT = 5001; 

// Permissive CORS for development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS']
}));

app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// MongoDB Connection
const MONGO_URI = "mongodb+srv://schitlangia26_db_user:jj7hzTTPK6i04gPF@cluster0.qvz3y1x.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    seedAdmin();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Seed Admin
const seedAdmin = async () => {
  const adminEmail = "sajal.chitlangia2602@gmail.com";
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Shamballa@26", salt);
    await User.create({
      email: adminEmail,
      passwordHash,
      isAdmin: true,
      role: 'Owner',
      profiles: [{ id: '1', name: 'Sajal', avatar: 'https://picsum.photos/id/1005/200/200', accentColor: 'red', language: 'en' }]
    });
    console.log('Admin account seeded.');
  }
};

// --- AUTH ROUTES ---

// 1. Send OTP Endpoint
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`Attempting to send OTP to ${email}`);
        
        // Check if user already exists
        const existing = await User.findOne({ email });
        if (existing) {
            console.log('User exists');
            return res.status(400).json({ message: 'User already exists. Please login.' });
        }

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to DB
        await Otp.deleteMany({ email }); // Clear old OTPs
        await Otp.create({ email, code });

        // MOCK EMAIL SENDING
        console.log(`\n========================================`);
        console.log(`🔐 OTP for ${email}: ${code}`);
        console.log(`========================================\n`);

        res.json({ message: 'OTP sent successfully. Check server console for code.' });
    } catch (err) {
        console.error('Send OTP Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// 2. Signup with OTP Verification
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    
    // Verify OTP
    const validOtp = await Otp.findOne({ email, code: otp });
    if (!validOtp) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      passwordHash,
      profiles: [{ id: Date.now().toString(), name: 'Main', avatar: 'https://picsum.photos/id/1011/200/200', accentColor: 'blue', language: 'en' }]
    });

    // Clean up OTP
    await Otp.deleteMany({ email });

    console.log(`New user created: ${email}`);
    res.json({ message: 'Account created successfully', user: { email: newUser.email, id: newUser._id } });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, device } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Handle Device
    if (device) {
        const existingDeviceIndex = user.devices.findIndex(d => d.deviceId === device.deviceId);
        if (existingDeviceIndex > -1) {
            user.devices[existingDeviceIndex].lastActive = new Date();
            user.devices[existingDeviceIndex].ip = device.ip || '127.0.0.1';
        } else {
            user.devices.push({ ...device, lastActive: new Date(), ip: device.ip || '127.0.0.1' });
        }
    }
    
    user.lastLogin = new Date();
    await user.save();

    res.json({ 
        user: { 
            _id: user._id, 
            id: user._id, 
            email: user.email, 
            isAdmin: user.isAdmin,
            watchlist: user.watchlist,
            likes: user.likes
        },
        profiles: user.profiles
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/logout', async (req, res) => {
    try {
        const { userId, deviceId } = req.body;
        const user = await User.findById(userId);
        if (user) {
            user.devices = user.devices.filter(d => d.deviceId !== deviceId);
            await user.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- USER MANAGEMENT ROUTES ---

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, '-passwordHash');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- WATCHLIST ROUTES ---

app.post('/api/watchlist/add', async (req, res) => {
    try {
        const { userId, item } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Check duplicates
        if (!user.watchlist.some(w => w.mediaId === item.mediaId)) {
            user.watchlist.push(item);
            await user.save();
        }
        res.json(user.watchlist);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/watchlist/remove', async (req, res) => {
    try {
        const { userId, mediaId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.watchlist = user.watchlist.filter(w => w.mediaId !== mediaId);
        await user.save();
        res.json(user.watchlist);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/watchlist/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.watchlist);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- LIKES ROUTES ---

app.post('/api/likes/add', async (req, res) => {
    try {
        const { userId, item } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Check duplicates
        if (!user.likes.some(w => w.mediaId === item.mediaId)) {
            user.likes.push(item);
            await user.save();
        }
        res.json(user.likes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/likes/remove', async (req, res) => {
    try {
        const { userId, mediaId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.likes = user.likes.filter(w => w.mediaId !== mediaId);
        await user.save();
        res.json(user.likes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/likes/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.likes || []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- DEVICE ROUTES ---
app.get('/api/devices/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.devices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/devices/remove', async (req, res) => {
    try {
        const { userId, deviceId } = req.body;
        const user = await User.findById(userId);
        if (user) {
            user.devices = user.devices.filter(d => d.deviceId !== deviceId);
            await user.save();
            res.json(user.devices);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Bind to 0.0.0.0 to listen on all interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});