const mongoose = require('mongoose');

const chatRoomMemberSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

chatRoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });
chatRoomMemberSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('ChatRoomMember', chatRoomMemberSchema);
