const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  roomType: {
    type: String,
    enum: ['private', 'group', 'channel', 'broadcast'],
    default: 'group',
    required: true
  },
  avatarUrl: {
    type: String
  },
  createdBy: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowForwarding: {
      type: Boolean,
      default: true
    },
    allowScreenSharing: {
      type: Boolean,
      default: true
    },
    allowVoiceMessages: {
      type: Boolean,
      default: true
    },
    messageRetentionDays: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

chatRoomSchema.index({ companyId: 1, roomType: 1 });
chatRoomSchema.index({ createdBy: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
