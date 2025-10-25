const mongoose = require('mongoose');

const chatReactionSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

chatReactionSchema.index({ messageId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChatReaction', chatReactionSchema);
