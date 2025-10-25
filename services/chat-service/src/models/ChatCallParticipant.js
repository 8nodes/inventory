const mongoose = require('mongoose');

const chatCallParticipantSchema = new mongoose.Schema({
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatCall',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['invited', 'joined', 'left', 'declined'],
    default: 'invited'
  },
  joinedAt: {
    type: Date
  },
  leftAt: {
    type: Date
  }
}, {
  timestamps: true
});

chatCallParticipantSchema.index({ callId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChatCallParticipant', chatCallParticipantSchema);
