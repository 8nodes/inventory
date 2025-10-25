const mongoose = require('mongoose');

const chatMediaSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true,
    index: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'voice'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  mimeType: {
    type: String
  },
  duration: {
    type: Number
  },
  dimensions: {
    width: Number,
    height: Number
  }
}, {
  timestamps: true
});

chatMediaSchema.index({ messageId: 1 });

module.exports = mongoose.model('ChatMedia', chatMediaSchema);
