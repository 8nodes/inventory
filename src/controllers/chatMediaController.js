const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');
const multer = require('multer');
const path = require('path');

const logger = createLogger('chat-media-controller');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, audio, video, and documents are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

const getMediaType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'voice_note';
  if (mimetype.startsWith('video/')) return 'video';
  return 'file';
};

const uploadChatMedia = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('room_id, sender_id')
      .eq('id', messageId)
      .maybeSingle();

    if (messageError) throw messageError;

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload media to your own messages'
      });
    }

    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
    const filePath = `chat-media/${message.room_id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      logger.error('File upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        error: uploadError.message
      });
    }

    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    const mediaType = getMediaType(req.file.mimetype);

    const { data: media, error: mediaError } = await supabase
      .from('chat_message_media')
      .insert({
        message_id: messageId,
        media_type: mediaType,
        file_name: req.file.originalname,
        file_url: urlData.publicUrl,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      })
      .select()
      .single();

    if (mediaError) throw mediaError;

    logger.info(`Media uploaded: ${media.id} for message: ${messageId}`);

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: media
    });
  } catch (error) {
    logger.error('Error uploading media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: error.message
    });
  }
};

const getMessageMedia = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('room_id')
      .eq('id', messageId)
      .maybeSingle();

    if (messageError) throw messageError;

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const { data: membership, error: memberError } = await supabase
      .from('chat_room_members')
      .select('id')
      .eq('room_id', message.room_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat room'
      });
    }

    const { data: media, error: mediaError } = await supabase
      .from('chat_message_media')
      .select('*')
      .eq('message_id', messageId);

    if (mediaError) throw mediaError;

    res.status(200).json({
      success: true,
      data: media
    });
  } catch (error) {
    logger.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch media',
      error: error.message
    });
  }
};

const deleteMessageMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user.userId;

    const { data: media, error: mediaError } = await supabase
      .from('chat_message_media')
      .select(`
        *,
        chat_messages!inner(sender_id, room_id)
      `)
      .eq('id', mediaId)
      .maybeSingle();

    if (mediaError) throw mediaError;

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    if (media.chat_messages.sender_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete media from your own messages'
      });
    }

    const filePath = media.file_url.split('/chat-files/')[1];
    if (filePath) {
      await supabase.storage
        .from('chat-files')
        .remove([filePath]);
    }

    const { error: deleteError } = await supabase
      .from('chat_message_media')
      .delete()
      .eq('id', mediaId);

    if (deleteError) throw deleteError;

    logger.info(`Media deleted: ${mediaId}`);

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete media',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadChatMedia,
  getMessageMedia,
  deleteMessageMedia
};
