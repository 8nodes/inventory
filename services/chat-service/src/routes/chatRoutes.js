const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.post('/rooms', auth, chatController.createChatRoom);
router.get('/rooms', auth, chatController.getMyChatRooms);

router.get('/rooms/:roomId/messages/search', auth, chatController.searchMessages);
router.post('/rooms/:roomId/messages', auth, chatController.sendMessage);
router.put('/messages/:messageId', auth, chatController.updateMessage);
router.delete('/messages/:messageId', auth, chatController.deleteMessage);

router.post('/messages/:messageId/forward', auth, chatController.forwardMessage);
router.post('/broadcast', auth, chatController.sendBroadcastMessage);

router.post('/messages/:messageId/reactions', auth, chatController.addReaction);
router.post('/rooms/:roomId/read', auth, chatController.markAsRead);

router.get('/rooms/:roomId/export', auth, chatController.exportChat);

router.post('/rooms/:roomId/calls', auth, chatController.initiateCall);
router.put('/calls/:callId/screen-sharing', auth, chatController.toggleScreenSharing);

router.post('/messages/:messageId/transcription', auth, chatController.addVoiceTranscription);

module.exports = router;
