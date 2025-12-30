const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  name: { type: String, required: true }, // User Agent friendly name
  type: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
  ip: { type: String },
  lastActive: { type: Date, default: Date.now }
});

const MediaItemSchema = new mongoose.Schema({
  mediaId: { type: Number, required: true },
  mediaType: { type: String, enum: ['movie', 'tv'], required: true },
  title: { type: String },
  posterPath: { type: String },
  voteAverage: { type: Number },
  addedAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  role: { type: String, default: 'User' },
  status: { type: String, default: 'Active' },
  joinedDate: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  devices: [DeviceSchema],
  watchlist: [MediaItemSchema],
  likes: [MediaItemSchema], // Added Likes
  profiles: { type: Array, default: [] } 
});

const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete after 5 minutes (300s)
});

module.exports = {
  User: mongoose.model('User', UserSchema),
  Otp: mongoose.model('Otp', OtpSchema)
};