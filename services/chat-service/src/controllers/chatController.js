const ChatRoom = require('../models/ChatRoom');
const ChatRoomMember = require('../models/ChatRoomMember');
const ChatMessage = require('../models/ChatMessage');
const ChatMedia = require('../models/ChatMedia');
const ChatReaction = require('../models/ChatReaction');
const ChatCall = require('../models/ChatCall');
const ChatCallParticipant = require('../models/ChatCallParticipant');
const { getLinkPreview } = require('link-preview-js');
const { logger } = require('../utils/logger');

const createChatRoom = async (req, res) => {
  try {
    const { name, description, roomType, memberUserIds, settings } = req.body;
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    if (roomType === 'private' && memberUserIds?.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Private chat must have exactly one other member'
      });
    }

    if (roomType === 'private') {
      const existingRoom = await ChatRoom.findOne({
        companyId,
        roomType: 'private'
      });

      if (existingRoom) {
        const members = await ChatRoomMember.find({
          roomId: existingRoom._id,
          isActive: true
        });

        const memberIds = members.map(m => m.userId);
        if (memberIds.includes(userId) && memberIds.includes(memberUserIds[0])) {
          return res.status(200).json({
            success: true,
            message: 'Private chat already exists',
            data: { id: existingRoom._id, existing: true }
          });
        }
      }
    }

    const room = new ChatRoom({
      companyId,
      name: roomType === 'private' ? null : name,
      description,
      roomType,
      createdBy: userId,
      settings: settings || {}
    });

    await room.save();

    const membersToAdd = [
      new ChatRoomMember({ roomId: room._id, userId, role: 'admin' }),
      ...(memberUserIds || []).map(uid => new ChatRoomMember({
        roomId: room._id,
        userId: uid,
        role: 'member'
      }))
    ];

    await ChatRoomMember.insertMany(membersToAdd);

    logger.info(`Chat room created: ${room._id} by user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: room
    });
  } catch (error) {
    logger.error('Error creating chat room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room',
      error: error.message
    });
  }
};

const getMyChatRooms = async (req, res) => {
  try {
    const userId = req.user.userId;

    const roomMembers = await ChatRoomMember.find({
      userId,
      isActive: true
    }).populate('roomId');

    const roomsWithDetails = await Promise.all(
      roomMembers.map(async (rm) => {
        const unreadCount = await ChatMessage.countDocuments({
          roomId: rm.roomId._id,
          createdAt: { $gt: rm.lastReadAt },
          isDeleted: false
        });

        const lastMessage = await ChatMessage.findOne({
          roomId: rm.roomId._id,
          isDeleted: false
        }).sort({ createdAt: -1 });

        const memberCount = await ChatRoomMember.countDocuments({
          roomId: rm.roomId._id,
          isActive: true
        });

        return {
          ...rm.roomId.toObject(),
          userRole: rm.role,
          isMuted: rm.isMuted,
          unreadCount,
          lastMessage,
          memberCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: roomsWithDetails
    });
  } catch (error) {
    logger.error('Error fetching chat rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat rooms',
      error: error.message
    });
  }
};

const searchMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { query, limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    const membership = await ChatRoomMember.findOne({
      roomId,
      userId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    const messages = await ChatMessage.find({
      roomId,
      $text: { $search: query },
      isDeleted: false
    })
      .sort({ score: { $meta: 'textScore' } })
      .skip(offset)
      .limit(limit)
      .populate('replyToId');

    res.status(200).json({
      success: true,
      data: {
        messages,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    logger.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: error.message
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType, replyToId, metadata, formatting, scheduledFor } = req.body;
    const userId = req.user.userId;

    const membership = await ChatRoomMember.findOne({
      roomId,
      userId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    const messageData = {
      roomId,
      senderId: userId,
      content,
      messageType: messageType || 'text',
      replyToId,
      metadata: metadata || {},
      formatting: formatting || {}
    };

    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate > new Date()) {
        messageData.scheduledFor = scheduledDate;
        messageData.isScheduled = true;
      }
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);

    if (urls && urls.length > 0 && messageType === 'text') {
      try {
        const preview = await getLinkPreview(urls[0]);
        messageData.linkPreview = {
          url: preview.url,
          title: preview.title,
          description: preview.description,
          imageUrl: preview.images?.[0],
          siteName: preview.siteName
        };
      } catch (err) {
        logger.warn('Failed to generate link preview:', err.message);
      }
    }

    const room = await ChatRoom.findById(roomId);
    if (room.settings?.messageRetentionDays > 0) {
      const autoDeleteDate = new Date();
      autoDeleteDate.setDate(autoDeleteDate.getDate() + room.settings.messageRetentionDays);
      messageData.autoDeleteAt = autoDeleteDate;
    }

    const message = new ChatMessage(messageData);
    await message.save();

    if (!messageData.isScheduled) {
      await ChatRoom.findByIdAndUpdate(roomId, { updatedAt: new Date() });
    }

    logger.info(`Message sent: ${message._id} in room: ${roomId}`);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

const forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { targetRoomIds } = req.body;
    const userId = req.user.userId;

    const originalMessage = await ChatMessage.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const sourceMembership = await ChatRoomMember.findOne({
      roomId: originalMessage.roomId,
      userId,
      isActive: true
    });

    if (!sourceMembership) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this message'
      });
    }

    const forwardedMessages = [];

    for (const targetRoomId of targetRoomIds) {
      const targetMembership = await ChatRoomMember.findOne({
        roomId: targetRoomId,
        userId,
        isActive: true
      });

      if (!targetMembership) continue;

      const targetRoom = await ChatRoom.findById(targetRoomId);
      if (!targetRoom.settings?.allowForwarding) continue;

      const forwardedMessage = new ChatMessage({
        roomId: targetRoomId,
        senderId: userId,
        content: originalMessage.content,
        messageType: originalMessage.messageType,
        metadata: originalMessage.metadata,
        forwardedFrom: {
          messageId: originalMessage._id,
          roomId: originalMessage.roomId,
          senderId: originalMessage.senderId
        }
      });

      await forwardedMessage.save();
      forwardedMessages.push(forwardedMessage);

      if (originalMessage.messageType !== 'text') {
        const media = await ChatMedia.find({ messageId: originalMessage._id });
        const newMedia = media.map(m => ({
          messageId: forwardedMessage._id,
          mediaType: m.mediaType,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          fileName: m.fileName,
          fileSize: m.fileSize,
          mimeType: m.mimeType,
          duration: m.duration,
          dimensions: m.dimensions
        }));
        await ChatMedia.insertMany(newMedia);
      }
    }

    logger.info(`Message ${messageId} forwarded to ${forwardedMessages.length} rooms`);

    res.status(200).json({
      success: true,
      message: 'Message forwarded successfully',
      data: { forwardedCount: forwardedMessages.length }
    });
  } catch (error) {
    logger.error('Error forwarding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forward message',
      error: error.message
    });
  }
};

const sendBroadcastMessage = async (req, res) => {
  try {
    const { content, messageType, metadata, targetUserIds } = req.body;
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    const broadcastRoom = new ChatRoom({
      companyId,
      name: `Broadcast from ${userId}`,
      roomType: 'broadcast',
      createdBy: userId
    });

    await broadcastRoom.save();

    const members = [
      new ChatRoomMember({ roomId: broadcastRoom._id, userId, role: 'admin' }),
      ...(targetUserIds || []).map(uid => new ChatRoomMember({
        roomId: broadcastRoom._id,
        userId: uid,
        role: 'member'
      }))
    ];

    await ChatRoomMember.insertMany(members);

    const message = new ChatMessage({
      roomId: broadcastRoom._id,
      senderId: userId,
      content,
      messageType: messageType || 'text',
      metadata: metadata || {}
    });

    await message.save();

    logger.info(`Broadcast message sent to ${targetUserIds.length} users`);

    res.status(201).json({
      success: true,
      message: 'Broadcast message sent successfully',
      data: { broadcastRoomId: broadcastRoom._id, messageId: message._id }
    });
  } catch (error) {
    logger.error('Error sending broadcast message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast message',
      error: error.message
    });
  }
};

const exportChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { format = 'json', startDate, endDate } = req.query;
    const userId = req.user.userId;

    const membership = await ChatRoomMember.findOne({
      roomId,
      userId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    const query = {
      roomId,
      isDeleted: false
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .populate('replyToId');

    const room = await ChatRoom.findById(roomId);

    const exportData = {
      room: {
        id: room._id,
        name: room.name,
        roomType: room.roomType,
        exportedAt: new Date().toISOString(),
        exportedBy: userId
      },
      messages: messages.map(msg => ({
        id: msg._id,
        senderId: msg.senderId,
        content: msg.content,
        messageType: msg.messageType,
        createdAt: msg.createdAt,
        editedAt: msg.editedAt,
        replyTo: msg.replyToId ? {
          id: msg.replyToId._id,
          content: msg.replyToId.content
        } : null,
        forwardedFrom: msg.forwardedFrom,
        metadata: msg.metadata
      }))
    };

    if (format === 'json') {
      res.status(200).json({
        success: true,
        data: exportData
      });
    } else if (format === 'txt') {
      const txtContent = messages.map(msg =>
        `[${msg.createdAt}] ${msg.senderId}: ${msg.content}`
      ).join('\n');

      res.status(200)
        .header('Content-Type', 'text/plain')
        .header('Content-Disposition', `attachment; filename="chat-export-${roomId}.txt"`)
        .send(txtContent);
    }

    logger.info(`Chat exported: ${roomId} by user: ${userId}`);
  } catch (error) {
    logger.error('Error exporting chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export chat',
      error: error.message
    });
  }
};

const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, formatting } = req.body;
    const userId = req.user.userId;

    const message = await ChatMessage.findOneAndUpdate(
      { _id: messageId, senderId: userId },
      {
        content,
        formatting: formatting || {},
        editedAt: new Date()
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or unauthorized'
      });
    }

    logger.info(`Message updated: ${messageId}`);

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    logger.error('Error updating message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message',
      error: error.message
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await ChatMessage.findOneAndUpdate(
      { _id: messageId, senderId: userId },
      {
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or unauthorized'
      });
    }

    logger.info(`Message deleted: ${messageId}`);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;

    const reaction = new ChatReaction({
      messageId,
      userId,
      emoji
    });

    await reaction.save();

    logger.info(`Reaction added to message: ${messageId}`);

    res.status(201).json({
      success: true,
      message: 'Reaction added successfully',
      data: reaction
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reacted to this message'
      });
    }

    logger.error('Error adding reaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      error: error.message
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    await ChatRoomMember.findOneAndUpdate(
      { roomId, userId },
      { lastReadAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

const initiateCall = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { callType } = req.body;
    const userId = req.user.userId;

    const membership = await ChatRoomMember.findOne({
      roomId,
      userId,
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    const call = new ChatCall({
      roomId,
      callType: callType || 'voice',
      initiatedBy: userId,
      status: 'ringing'
    });

    await call.save();

    const members = await ChatRoomMember.find({
      roomId,
      isActive: true,
      userId: { $ne: userId }
    });

    const participantInserts = [
      new ChatCallParticipant({
        callId: call._id,
        userId,
        status: 'joined',
        joinedAt: new Date()
      }),
      ...members.map(m => new ChatCallParticipant({
        callId: call._id,
        userId: m.userId,
        status: 'invited'
      }))
    ];

    await ChatCallParticipant.insertMany(participantInserts);

    logger.info(`Call initiated: ${call._id} in room: ${roomId}`);

    res.status(201).json({
      success: true,
      message: 'Call initiated successfully',
      data: call
    });
  } catch (error) {
    logger.error('Error initiating call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate call',
      error: error.message
    });
  }
};

const toggleScreenSharing = async (req, res) => {
  try {
    const { callId } = req.params;
    const { enable } = req.body;
    const userId = req.user.userId;

    const call = await ChatCall.findById(callId).populate('roomId');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    if (!call.roomId.settings?.allowScreenSharing) {
      return res.status(403).json({
        success: false,
        message: 'Screen sharing is not allowed in this room'
      });
    }

    const updateData = {
      'screenSharing.isActive': enable,
      'screenSharing.sharedBy': enable ? userId : null,
      'screenSharing.startedAt': enable ? new Date() : null
    };

    const updatedCall = await ChatCall.findByIdAndUpdate(
      callId,
      updateData,
      { new: true }
    );

    logger.info(`Screen sharing ${enable ? 'enabled' : 'disabled'} for call: ${callId}`);

    res.status(200).json({
      success: true,
      message: `Screen sharing ${enable ? 'enabled' : 'disabled'}`,
      data: updatedCall
    });
  } catch (error) {
    logger.error('Error toggling screen sharing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle screen sharing',
      error: error.message
    });
  }
};

const addVoiceTranscription = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text, language, confidence } = req.body;
    const userId = req.user.userId;

    const message = await ChatMessage.findOne({
      _id: messageId,
      senderId: userId,
      messageType: 'voice'
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Voice message not found or unauthorized'
      });
    }

    message.voiceTranscription = {
      text,
      language: language || 'en',
      confidence: confidence || 0
    };

    await message.save();

    logger.info(`Voice transcription added to message: ${messageId}`);

    res.status(200).json({
      success: true,
      message: 'Voice transcription added successfully',
      data: message
    });
  } catch (error) {
    logger.error('Error adding voice transcription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add voice transcription',
      error: error.message
    });
  }
};

module.exports = {
  createChatRoom,
  getMyChatRooms,
  searchMessages,
  sendMessage,
  forwardMessage,
  sendBroadcastMessage,
  exportChat,
  updateMessage,
  deleteMessage,
  addReaction,
  markAsRead,
  initiateCall,
  toggleScreenSharing,
  addVoiceTranscription
};
