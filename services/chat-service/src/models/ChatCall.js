const mongoose = require('mongoose');

const chatCallSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
    index: true
  },
  callType: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  initiatedBy: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ringing', 'ongoing', 'ended', 'missed', 'declined'],
    default: 'ringing'
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  screenSharing: {
    isActive: {
      type: Boolean,
      default: false
    },
    sharedBy: String,
    startedAt: Date
  }
}, {
  timestamps: true
});

chatCallSchema.index({ roomId: 1, createdAt: -1 });
chatCallSchema.index({ initiatedBy: 1 });

module.exports = mongoose.model('ChatCall', chatCallSchema);
