const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image', 'video', 'audio', 'voice', 'location', 'system'],
    default: 'text'
  },
  replyToId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  forwardedFrom: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage'
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom'
    },
    senderId: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  formatting: {
    bold: [{ start: Number, end: Number }],
    italic: [{ start: Number, end: Number }],
    underline: [{ start: Number, end: Number }],
    strikethrough: [{ start: Number, end: Number }],
    code: [{ start: Number, end: Number }],
    mentions: [{ userId: String, start: Number, end: Number }]
  },
  linkPreview: {
    url: String,
    title: String,
    description: String,
    imageUrl: String,
    siteName: String
  },
  voiceTranscription: {
    text: String,
    language: String,
    confidence: Number
  },
  scheduledFor: {
    type: Date
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  autoDeleteAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  editedAt: {
    type: Date
  },
  deliveredTo: [{
    userId: String,
    deliveredAt: Date
  }],
  readBy: [{
    userId: String,
    readAt: Date
  }]
}, {
  timestamps: true
});

chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ roomId: 1, isDeleted: 1, createdAt: -1 });
chatMessageSchema.index({ roomId: 1, isScheduled: 1, scheduledFor: 1 });
chatMessageSchema.index({ autoDeleteAt: 1 }, { sparse: true });
chatMessageSchema.index({ content: 'text' });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
