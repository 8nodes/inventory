const { createClient } = require('@supabase/supabase-js');
const { createLogger } = require('../utils/logger');

const logger = createLogger('chat-controller');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const createChatRoom = async (req, res) => {
  try {
    const { name, description, room_type, member_user_ids } = req.body;
    const userId = req.user.userId;

    const { data: companyUser, error: cuError } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (cuError) throw cuError;

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: 'User is not part of any company'
      });
    }

    if (room_type === 'private' && member_user_ids?.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Private chat must have exactly one other member'
      });
    }

    if (room_type === 'private') {
      const { data: existingRoom, error: searchError } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          chat_room_members!inner(user_id)
        `)
        .eq('company_id', companyUser.company_id)
        .eq('room_type', 'private');

      if (searchError) throw searchError;

      const privateRoom = existingRoom?.find(room => {
        const members = room.chat_room_members.map(m => m.user_id);
        return members.includes(userId) && members.includes(member_user_ids[0]);
      });

      if (privateRoom) {
        return res.status(200).json({
          success: true,
          message: 'Private chat already exists',
          data: { id: privateRoom.id, existing: true }
        });
      }
    }

    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({
        company_id: companyUser.company_id,
        name: room_type === 'private' ? null : name,
        description,
        room_type,
        created_by: userId,
        is_active: true
      })
      .select()
      .single();

    if (roomError) throw roomError;

    const membersToAdd = [
      { room_id: room.id, user_id: userId, role: 'admin' },
      ...(member_user_ids || []).map(uid => ({
        room_id: room.id,
        user_id: uid,
        role: 'member'
      }))
    ];

    const { error: membersError } = await supabase
      .from('chat_room_members')
      .insert(membersToAdd);

    if (membersError) throw membersError;

    logger.info(`Chat room created: ${room.id} by user: ${userId}`);

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

    const { data: roomMembers, error: rmError } = await supabase
      .from('chat_room_members')
      .select(`
        room_id,
        role,
        last_read_at,
        is_muted,
        chat_rooms (
          id,
          name,
          description,
          room_type,
          avatar_url,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (rmError) throw rmError;

    const roomsWithDetails = await Promise.all(
      roomMembers.map(async (rm) => {
        const { data: unreadCount } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', rm.room_id)
          .gt('created_at', rm.last_read_at);

        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', rm.room_id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: memberCount } = await supabase
          .from('chat_room_members')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', rm.room_id)
          .eq('is_active', true);

        return {
          ...rm.chat_rooms,
          userRole: rm.role,
          isMuted: rm.is_muted,
          unreadCount: unreadCount || 0,
          lastMessage,
          memberCount: memberCount || 0
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

const getChatRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const { data: membership, error: memberError } = await supabase
      .from('chat_room_members')
      .select('role, is_muted')
      .eq('room_id', roomId)
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

    const { data: room, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) throw roomError;

    const { data: members, error: membersError } = await supabase
      .from('chat_room_members')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true);

    if (membersError) throw membersError;

    res.status(200).json({
      success: true,
      data: {
        ...room,
        userRole: membership.role,
        isMuted: membership.is_muted,
        members
      }
    });
  } catch (error) {
    logger.error('Error fetching chat room details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat room details',
      error: error.message
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, message_type, reply_to_id, metadata } = req.body;
    const userId = req.user.userId;

    const { data: membership, error: memberError } = await supabase
      .from('chat_room_members')
      .select('id')
      .eq('room_id', roomId)
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

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: userId,
        content,
        message_type: message_type || 'text',
        reply_to_id,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (messageError) throw messageError;

    await supabase
      .from('chat_rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);

    logger.info(`Message sent: ${message.id} in room: ${roomId}`);

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

const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0, before } = req.query;
    const userId = req.user.userId;

    const { data: membership, error: memberError } = await supabase
      .from('chat_room_members')
      .select('id')
      .eq('room_id', roomId)
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

    let query = supabase
      .from('chat_messages')
      .select(`
        *,
        chat_message_media(*),
        chat_message_reactions(*)
      `)
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) throw messagesError;

    res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(),
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .update({
        content,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select()
      .single();

    if (messageError) throw messageError;

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

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select()
      .single();

    if (messageError) throw messageError;

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

    const { data: reaction, error: reactionError } = await supabase
      .from('chat_message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji
      })
      .select()
      .single();

    if (reactionError) throw reactionError;

    logger.info(`Reaction added to message: ${messageId}`);

    res.status(201).json({
      success: true,
      message: 'Reaction added successfully',
      data: reaction
    });
  } catch (error) {
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

    const { error: updateError } = await supabase
      .from('chat_room_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

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
    const { call_type } = req.body;
    const userId = req.user.userId;

    const { data: membership, error: memberError } = await supabase
      .from('chat_room_members')
      .select('id')
      .eq('room_id', roomId)
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

    const { data: call, error: callError } = await supabase
      .from('chat_calls')
      .insert({
        room_id: roomId,
        call_type: call_type || 'voice',
        initiated_by: userId,
        status: 'ringing'
      })
      .select()
      .single();

    if (callError) throw callError;

    const { data: members, error: membersError } = await supabase
      .from('chat_room_members')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .neq('user_id', userId);

    if (membersError) throw membersError;

    const participantInserts = members.map(m => ({
      call_id: call.id,
      user_id: m.user_id,
      status: 'invited'
    }));

    if (participantInserts.length > 0) {
      await supabase
        .from('chat_call_participants')
        .insert(participantInserts);
    }

    await supabase
      .from('chat_call_participants')
      .insert({
        call_id: call.id,
        user_id: userId,
        status: 'joined',
        joined_at: new Date().toISOString()
      });

    logger.info(`Call initiated: ${call.id} in room: ${roomId}`);

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

const updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const { data: call, error: callError } = await supabase
      .from('chat_calls')
      .update({ status })
      .eq('id', callId)
      .eq('initiated_by', userId)
      .select()
      .single();

    if (callError) throw callError;

    if (status === 'ended') {
      const startTime = new Date(call.started_at);
      const endTime = new Date();
      const duration = Math.floor((endTime - startTime) / 1000);

      await supabase
        .from('chat_calls')
        .update({
          ended_at: endTime.toISOString(),
          duration
        })
        .eq('id', callId);
    }

    res.status(200).json({
      success: true,
      message: 'Call status updated',
      data: call
    });
  } catch (error) {
    logger.error('Error updating call status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update call status',
      error: error.message
    });
  }
};

module.exports = {
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
};
