const express = require('express');
const router = express.Router();
const {
  createChatRoom,
  getMyChatRooms,
  getChatRoomDetails,
  sendMessage,
  getRoomMessages,
  updateMessage,
  deleteMessage,
  addReaction,
  markAsRead,
  initiateCall,
  updateCallStatus
} = require('../controllers/chatController');
const {
  upload,
  uploadChatMedia,
  getMessageMedia,
  deleteMessageMedia
} = require('../controllers/chatMediaController');
const auth = require('../middleware/auth');

router.post('/rooms', auth, createChatRoom);
router.get('/rooms', auth, getMyChatRooms);
router.get('/rooms/:roomId', auth, getChatRoomDetails);
router.post('/rooms/:roomId/messages', auth, sendMessage);
router.get('/rooms/:roomId/messages', auth, getRoomMessages);
router.patch('/messages/:messageId', auth, updateMessage);
router.delete('/messages/:messageId', auth, deleteMessage);
router.post('/messages/:messageId/reactions', auth, addReaction);
router.post('/rooms/:roomId/read', auth, markAsRead);
router.post('/rooms/:roomId/calls', auth, initiateCall);
router.patch('/calls/:callId', auth, updateCallStatus);
router.post('/messages/:messageId/media', auth, upload.single('file'), uploadChatMedia);
router.get('/messages/:messageId/media', auth, getMessageMedia);
router.delete('/media/:mediaId', auth, deleteMessageMedia);

module.exports = router;
