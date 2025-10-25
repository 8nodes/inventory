/*
  # Company Chat System

  ## Overview
  This migration creates a comprehensive real-time chat system for company members with:
  - Company-wide group chat rooms
  - Private 1-on-1 chats between company members
  - Rich media support (images, files, voice notes)
  - Voice and video call infrastructure
  - Read receipts and typing indicators
  - Message reactions and threads

  ## New Tables

  ### 1. `chat_rooms`
  Stores chat rooms (both group and private)
  - `id` (uuid, primary key) - Unique room identifier
  - `company_id` (uuid, foreign key) - Reference to companies
  - `name` (text) - Room name (null for private chats)
  - `description` (text) - Room description
  - `room_type` (text) - Type: 'company_wide', 'group', 'private'
  - `created_by` (uuid) - User who created the room
  - `avatar_url` (text) - Room avatar/icon
  - `is_active` (boolean) - Whether room is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `chat_room_members`
  Tracks room membership
  - `id` (uuid, primary key) - Record identifier
  - `room_id` (uuid, foreign key) - Reference to chat_rooms
  - `user_id` (uuid) - User identifier
  - `role` (text) - Member role (admin, moderator, member)
  - `joined_at` (timestamptz) - When user joined
  - `last_read_at` (timestamptz) - Last message read timestamp
  - `is_muted` (boolean) - Whether notifications are muted
  - `is_active` (boolean) - Whether membership is active

  ### 3. `chat_messages`
  Stores all chat messages
  - `id` (uuid, primary key) - Message identifier
  - `room_id` (uuid, foreign key) - Reference to chat_rooms
  - `sender_id` (uuid) - User who sent the message
  - `message_type` (text) - Type: text, image, file, voice_note, system
  - `content` (text) - Message text content
  - `reply_to_id` (uuid) - Reference to parent message for threads
  - `edited_at` (timestamptz) - Last edit timestamp
  - `is_deleted` (boolean) - Soft delete flag
  - `metadata` (jsonb) - Additional message data
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. `chat_message_media`
  Stores media attachments
  - `id` (uuid, primary key) - Media identifier
  - `message_id` (uuid, foreign key) - Reference to chat_messages
  - `media_type` (text) - Type: image, file, voice_note
  - `file_name` (text) - Original file name
  - `file_url` (text) - Storage URL
  - `file_size` (bigint) - File size in bytes
  - `mime_type` (text) - File MIME type
  - `duration` (integer) - Duration for audio/video in seconds
  - `thumbnail_url` (text) - Thumbnail for images/videos
  - `created_at` (timestamptz) - Upload timestamp

  ### 5. `chat_message_reactions`
  Stores message reactions (emojis)
  - `id` (uuid, primary key) - Reaction identifier
  - `message_id` (uuid, foreign key) - Reference to chat_messages
  - `user_id` (uuid) - User who reacted
  - `emoji` (text) - Reaction emoji
  - `created_at` (timestamptz) - Reaction timestamp

  ### 6. `chat_message_read_receipts`
  Tracks message read status
  - `id` (uuid, primary key) - Receipt identifier
  - `message_id` (uuid, foreign key) - Reference to chat_messages
  - `user_id` (uuid) - User who read the message
  - `read_at` (timestamptz) - When message was read

  ### 7. `chat_typing_indicators`
  Real-time typing status
  - `id` (uuid, primary key) - Indicator identifier
  - `room_id` (uuid, foreign key) - Reference to chat_rooms
  - `user_id` (uuid) - User who is typing
  - `started_at` (timestamptz) - When typing started

  ### 8. `chat_calls`
  Voice and video call records
  - `id` (uuid, primary key) - Call identifier
  - `room_id` (uuid, foreign key) - Reference to chat_rooms
  - `call_type` (text) - Type: voice, video
  - `initiated_by` (uuid) - User who started the call
  - `status` (text) - Status: ringing, active, ended, missed
  - `started_at` (timestamptz) - Call start time
  - `ended_at` (timestamptz) - Call end time
  - `duration` (integer) - Call duration in seconds

  ### 9. `chat_call_participants`
  Tracks call participants
  - `id` (uuid, primary key) - Participant identifier
  - `call_id` (uuid, foreign key) - Reference to chat_calls
  - `user_id` (uuid) - Participant user
  - `joined_at` (timestamptz) - When joined call
  - `left_at` (timestamptz) - When left call
  - `status` (text) - Status: invited, joined, declined, left

  ## Security
  - Enable RLS on all tables
  - Users can only access rooms they are members of
  - Only room members can send/read messages
  - Room admins can manage room settings
*/

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text,
  description text,
  room_type text NOT NULL CHECK (room_type IN ('company_wide', 'group', 'private')),
  created_by uuid NOT NULL,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_room_members table
CREATE TABLE IF NOT EXISTS chat_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_muted boolean DEFAULT false,
  is_active boolean DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice_note', 'system', 'call')),
  content text,
  reply_to_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  edited_at timestamptz,
  is_deleted boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create chat_message_media table
CREATE TABLE IF NOT EXISTS chat_message_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'file', 'voice_note', 'video')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  mime_type text,
  duration integer,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- Create chat_message_reactions table
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create chat_message_read_receipts table
CREATE TABLE IF NOT EXISTS chat_message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create chat_typing_indicators table
CREATE TABLE IF NOT EXISTS chat_typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create chat_calls table
CREATE TABLE IF NOT EXISTS chat_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  call_type text NOT NULL CHECK (call_type IN ('voice', 'video')),
  initiated_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration integer DEFAULT 0
);

-- Create chat_call_participants table
CREATE TABLE IF NOT EXISTS chat_call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES chat_calls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'joined', 'declined', 'left')),
  UNIQUE(call_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_company_id ON chat_rooms(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_room_type ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_message_media_message_id ON chat_message_media(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message_id ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_read_receipts_message_id ON chat_message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_typing_indicators_room_id ON chat_typing_indicators(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_calls_room_id ON chat_calls(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_call_participants_call_id ON chat_call_participants(call_id);

-- Enable Row Level Security
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_call_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view rooms in their company"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can create rooms"
  ON chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Room admins can update rooms"
  ON chat_rooms FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- RLS Policies for chat_room_members
CREATE POLICY "Users can view members of their rooms"
  ON chat_room_members FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Room admins can add members"
  ON chat_room_members FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator') AND is_active = true
    )
  );

CREATE POLICY "Room admins can update members"
  ON chat_room_members FOR UPDATE
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator') AND is_active = true
    )
  )
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator') AND is_active = true
    )
  );

CREATE POLICY "Users can leave rooms"
  ON chat_room_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR room_id IN (
    SELECT room_id FROM chat_room_members
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  ));

-- RLS Policies for chat_messages
CREATE POLICY "Room members can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Room members can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- RLS Policies for chat_message_media
CREATE POLICY "Room members can view media"
  ON chat_message_media FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM chat_messages
      WHERE room_id IN (
        SELECT room_id FROM chat_room_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can upload media to their messages"
  ON chat_message_media FOR INSERT
  TO authenticated
  WITH CHECK (
    message_id IN (
      SELECT id FROM chat_messages
      WHERE sender_id = auth.uid()
    )
  );

-- RLS Policies for chat_message_reactions
CREATE POLICY "Room members can view reactions"
  ON chat_message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM chat_messages
      WHERE room_id IN (
        SELECT room_id FROM chat_room_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can add reactions"
  ON chat_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    message_id IN (
      SELECT id FROM chat_messages
      WHERE room_id IN (
        SELECT room_id FROM chat_room_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Users can remove their reactions"
  ON chat_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for chat_message_read_receipts
CREATE POLICY "Room members can view read receipts"
  ON chat_message_read_receipts FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM chat_messages
      WHERE room_id IN (
        SELECT room_id FROM chat_room_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON chat_message_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for chat_typing_indicators
CREATE POLICY "Room members can view typing indicators"
  ON chat_typing_indicators FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can set their typing status"
  ON chat_typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their typing status"
  ON chat_typing_indicators FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can clear their typing status"
  ON chat_typing_indicators FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for chat_calls
CREATE POLICY "Room members can view calls"
  ON chat_calls FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Room members can initiate calls"
  ON chat_calls FOR INSERT
  TO authenticated
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_room_members
      WHERE user_id = auth.uid() AND is_active = true
    ) AND initiated_by = auth.uid()
  );

CREATE POLICY "Call initiator can update call"
  ON chat_calls FOR UPDATE
  TO authenticated
  USING (initiated_by = auth.uid())
  WITH CHECK (initiated_by = auth.uid());

-- RLS Policies for chat_call_participants
CREATE POLICY "Call participants can view participant list"
  ON chat_call_participants FOR SELECT
  TO authenticated
  USING (
    call_id IN (
      SELECT id FROM chat_calls
      WHERE room_id IN (
        SELECT room_id FROM chat_room_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can join calls"
  ON chat_call_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their call status"
  ON chat_call_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger to auto-update updated_at for chat_rooms
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_typing_indicators
  WHERE started_at < now() - interval '10 seconds';
END;
$$ LANGUAGE plpgsql;
