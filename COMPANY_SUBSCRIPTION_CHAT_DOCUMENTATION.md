# Company Subscription & Chat System Documentation

## Overview

This document covers the implementation of the company subscription system with three tiers (Base, Pro, Max) and the real-time chat system with WhatsApp-like features.

---

## Table of Contents

1. [Subscription System](#subscription-system)
2. [Chat System](#chat-system)
3. [WebSocket Real-Time Features](#websocket-real-time-features)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Feature Comparison](#feature-comparison)

---

## Subscription System

### Subscription Tiers

The system offers three subscription tiers, each available as monthly or yearly subscriptions:

#### **Base Tier**
- **Monthly**: $29.99/month
- **Yearly**: $249.99/year (2 months free - equivalent to $20.83/month)
- **Features**:
  - Up to 10 users
  - 10 GB storage
  - Real-time chat (group & private)
  - Basic inventory management
- **Best for**: Small teams and startups

#### **Pro Tier**
- **Monthly**: $79.99/month
- **Yearly**: $666.66/year (2 months free - equivalent to $55.55/month)
- **Features**:
  - Up to 50 users
  - 50 GB storage
  - Real-time chat (group & private)
  - Basic & advanced inventory management
  - Analytics & reports
  - API access
- **Best for**: Growing businesses

#### **Max Tier**
- **Monthly**: $199.99/month
- **Yearly**: $1,666.58/year (2 months free - equivalent to $138.88/month)
- **Features**:
  - Up to 200 users
  - 200 GB storage
  - Real-time chat (group & private)
  - Full inventory management suite
  - Advanced analytics & reports
  - API access
  - Priority 24/7 support
  - Custom integrations
  - Dedicated account manager
- **Best for**: Enterprise companies

### Subscription Features

All subscription features are stored in the `subscription_features` table with tier-based access control:

| Feature | Base | Pro | Max |
|---------|------|-----|-----|
| Real-time Chat | ✓ | ✓ | ✓ |
| Basic Inventory | ✓ | ✓ | ✓ |
| Advanced Inventory | ✗ | ✓ | ✓ |
| Analytics & Reports | ✗ | ✓ | ✓ |
| API Access | ✗ | ✓ | ✓ |
| Priority Support | ✗ | ✗ | ✓ |
| Custom Integrations | ✗ | ✗ | ✓ |
| Dedicated Support | ✗ | ✗ | ✓ |

### Company Management

Each company has:
- **Subscription tier**: Base, Pro, or Max
- **Billing cycle**: Monthly or Yearly
- **Subscription status**: Active, Trial, Expired, or Cancelled
- **User limits**: Based on subscription tier
- **Storage limits**: Based on subscription tier

---

## Chat System

The chat system provides WhatsApp-like functionality for company-wide communication.

### Chat Room Types

#### 1. **Company-Wide Chat**
- Automatically includes all company members
- Ideal for announcements and general discussions
- Created by company admins

#### 2. **Group Chat**
- Custom groups with selected members
- Can be created by any company member
- Admins can manage members and settings

#### 3. **Private Chat (1-on-1)**
- Direct messaging between two company members
- Automatically created when users message each other
- Complete privacy between participants

### Message Types

The system supports multiple message types:

1. **Text Messages**: Plain text communication
2. **Images**: JPEG, PNG, GIF, WebP
3. **Files**: Documents (PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP)
4. **Voice Notes**: Audio messages (MP3, WAV, OGG, WebM)
5. **System Messages**: Automated notifications
6. **Call Records**: Voice and video call logs

### Rich Features

#### **Message Features**
- ✓ Message threads (reply to specific messages)
- ✓ Message editing (with edit indicator)
- ✓ Message deletion (soft delete)
- ✓ Message reactions (emoji responses)
- ✓ Read receipts (know when messages are read)
- ✓ Typing indicators (see when someone is typing)
- ✓ Media attachments (images, files, voice notes)

#### **Room Features**
- ✓ Room avatars/icons
- ✓ Room descriptions
- ✓ Member roles (admin, moderator, member)
- ✓ Mute notifications per room
- ✓ Unread message count
- ✓ Last message preview

#### **Call Features**
- ✓ Voice calls (1-on-1 and group)
- ✓ Video calls (1-on-1 and group)
- ✓ Call status tracking (ringing, active, ended, missed)
- ✓ Call duration recording
- ✓ Call participant tracking
- ✓ WebRTC signaling support

### Media Support

#### **Supported File Types**
- **Images**: JPEG, PNG, GIF, WebP
- **Audio**: MP3, WAV, OGG, WebM
- **Video**: MP4, WebM
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT
- **Archives**: ZIP

#### **Upload Limits**
- Maximum file size: 50 MB
- Storage organized by chat room
- Automatic cleanup with message deletion

---

## WebSocket Real-Time Features

### Connection

Users connect to the WebSocket server with JWT authentication:

```javascript
const socket = io('ws://your-server.com', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### **Client → Server Events**

| Event | Description | Payload |
|-------|-------------|---------|
| `join_chat_room` | Join a chat room | `{ roomId: string }` |
| `leave_chat_room` | Leave a chat room | `{ roomId: string }` |
| `chat_message` | Send a message | `{ roomId, messageId, content, messageType, metadata }` |
| `typing_indicator` | Show typing status | `{ roomId, isTyping: boolean }` |
| `message_read` | Mark message as read | `{ roomId, messageId }` |
| `message_reaction` | Add emoji reaction | `{ roomId, messageId, emoji }` |
| `voice_call_initiate` | Start a call | `{ roomId, callId, callType }` |
| `voice_call_answer` | Answer a call | `{ callId, roomId }` |
| `voice_call_decline` | Decline a call | `{ callId, roomId }` |
| `voice_call_end` | End a call | `{ callId, roomId }` |
| `webrtc_signal` | WebRTC signaling | `{ roomId, targetUserId, signal }` |

#### **Server → Client Events**

| Event | Description | Payload |
|-------|-------------|---------|
| `connected` | Connection successful | `{ userId, socketId, companyId }` |
| `user_online` | User came online | `{ userId, timestamp }` |
| `user_offline` | User went offline | `{ userId, timestamp }` |
| `user_joined_room` | User joined room | `{ userId, roomId, timestamp }` |
| `user_left_room` | User left room | `{ userId, roomId, timestamp }` |
| `new_message` | New message received | `{ messageId, roomId, senderId, content, ... }` |
| `user_typing` | User is typing | `{ userId, roomId, isTyping, timestamp }` |
| `message_read_receipt` | Message was read | `{ messageId, userId, roomId, timestamp }` |
| `new_reaction` | New reaction added | `{ messageId, userId, emoji, timestamp }` |
| `incoming_call` | Incoming call | `{ callId, roomId, callType, initiatedBy }` |
| `call_answered` | Call was answered | `{ callId, userId, timestamp }` |
| `call_declined` | Call was declined | `{ callId, userId, timestamp }` |
| `call_ended` | Call ended | `{ callId, endedBy, timestamp }` |
| `webrtc_signal` | WebRTC signal | `{ fromUserId, roomId, signal }` |

### Presence Tracking

The system automatically tracks:
- User online/offline status
- Connected users per company
- Active room memberships
- Typing indicators (auto-cleanup after 10 seconds)

---

## API Endpoints

### Subscription Endpoints

#### **Get Subscription Plans**
```http
GET /api/v1/subscriptions/plans
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": {
      "base": {
        "monthly": { "price": 29.99, "max_users": 10, ... },
        "yearly": { "price": 249.99, "max_users": 10, ... }
      },
      "pro": { ... },
      "max": { ... }
    }
  }
}
```

#### **Get Subscription Features**
```http
GET /api/v1/subscriptions/features
Authorization: Bearer {token}
```

#### **Create Company**
```http
POST /api/v1/subscriptions/company
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Acme Inc",
  "email": "contact@acme.com",
  "subscription_tier": "pro",
  "subscription_type": "yearly"
}
```

#### **Get My Company**
```http
GET /api/v1/subscriptions/company/me
Authorization: Bearer {token}
```

#### **Update Company Subscription**
```http
PATCH /api/v1/subscriptions/company/subscription
Authorization: Bearer {token}
Content-Type: application/json

{
  "subscription_tier": "max",
  "subscription_type": "yearly"
}
```

#### **Add Company User**
```http
POST /api/v1/subscriptions/company/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": "user-uuid",
  "role": "member"
}
```

#### **Get Company Users**
```http
GET /api/v1/subscriptions/company/users
Authorization: Bearer {token}
```

#### **Check Feature Access**
```http
GET /api/v1/subscriptions/feature/{feature_key}/access
Authorization: Bearer {token}
```

### Chat Endpoints

#### **Create Chat Room**
```http
POST /api/v1/chat/rooms
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Project Team",
  "description": "Project discussion",
  "room_type": "group",
  "member_user_ids": ["user1-uuid", "user2-uuid"]
}
```

**Room Types**: `company_wide`, `group`, `private`

#### **Get My Chat Rooms**
```http
GET /api/v1/chat/rooms
Authorization: Bearer {token}
```

**Response includes:**
- Room details
- Unread message count
- Last message preview
- Member count

#### **Get Chat Room Details**
```http
GET /api/v1/chat/rooms/{roomId}
Authorization: Bearer {token}
```

#### **Send Message**
```http
POST /api/v1/chat/rooms/{roomId}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Hello team!",
  "message_type": "text",
  "reply_to_id": "message-uuid-optional",
  "metadata": {}
}
```

#### **Get Room Messages**
```http
GET /api/v1/chat/rooms/{roomId}/messages?limit=50&offset=0&before=2024-01-01
Authorization: Bearer {token}
```

**Supports pagination with:**
- `limit`: Messages per page (default: 50)
- `offset`: Starting position
- `before`: Fetch messages before timestamp

#### **Update Message**
```http
PATCH /api/v1/chat/messages/{messageId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Updated message text"
}
```

#### **Delete Message**
```http
DELETE /api/v1/chat/messages/{messageId}
Authorization: Bearer {token}
```

#### **Add Reaction**
```http
POST /api/v1/chat/messages/{messageId}/reactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "emoji": "👍"
}
```

#### **Mark Messages as Read**
```http
POST /api/v1/chat/rooms/{roomId}/read
Authorization: Bearer {token}
```

#### **Upload Media**
```http
POST /api/v1/chat/messages/{messageId}/media
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary file data]
```

#### **Get Message Media**
```http
GET /api/v1/chat/messages/{messageId}/media
Authorization: Bearer {token}
```

#### **Delete Media**
```http
DELETE /api/v1/chat/media/{mediaId}
Authorization: Bearer {token}
```

#### **Initiate Call**
```http
POST /api/v1/chat/rooms/{roomId}/calls
Authorization: Bearer {token}
Content-Type: application/json

{
  "call_type": "voice"
}
```

**Call Types**: `voice`, `video`

#### **Update Call Status**
```http
PATCH /api/v1/chat/calls/{callId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "ended"
}
```

---

## Database Schema

### Subscription Tables

#### **companies**
```sql
- id (uuid, PK)
- name (text)
- email (text, unique)
- subscription_tier (text: base, pro, max)
- subscription_type (text: monthly, yearly)
- subscription_status (text: active, trial, expired, cancelled)
- subscription_start_date (timestamptz)
- subscription_end_date (timestamptz)
- max_users (integer)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### **subscription_plans**
```sql
- id (uuid, PK)
- tier (text)
- billing_cycle (text)
- price (decimal)
- features (jsonb)
- max_users (integer)
- max_storage_gb (integer)
- is_active (boolean)
- created_at (timestamptz)
```

#### **company_users**
```sql
- id (uuid, PK)
- company_id (uuid, FK → companies)
- user_id (uuid)
- role (text: owner, admin, member)
- is_active (boolean)
- joined_at (timestamptz)
- created_at (timestamptz)
```

#### **subscription_features**
```sql
- id (uuid, PK)
- feature_name (text)
- feature_key (text, unique)
- base_tier (boolean)
- pro_tier (boolean)
- max_tier (boolean)
- description (text)
- created_at (timestamptz)
```

### Chat Tables

#### **chat_rooms**
```sql
- id (uuid, PK)
- company_id (uuid, FK → companies)
- name (text)
- description (text)
- room_type (text: company_wide, group, private)
- created_by (uuid)
- avatar_url (text)
- is_active (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### **chat_room_members**
```sql
- id (uuid, PK)
- room_id (uuid, FK → chat_rooms)
- user_id (uuid)
- role (text: admin, moderator, member)
- joined_at (timestamptz)
- last_read_at (timestamptz)
- is_muted (boolean)
- is_active (boolean)
```

#### **chat_messages**
```sql
- id (uuid, PK)
- room_id (uuid, FK → chat_rooms)
- sender_id (uuid)
- message_type (text: text, image, file, voice_note, system, call)
- content (text)
- reply_to_id (uuid, FK → chat_messages)
- edited_at (timestamptz)
- is_deleted (boolean)
- metadata (jsonb)
- created_at (timestamptz)
```

#### **chat_message_media**
```sql
- id (uuid, PK)
- message_id (uuid, FK → chat_messages)
- media_type (text: image, file, voice_note, video)
- file_name (text)
- file_url (text)
- file_size (bigint)
- mime_type (text)
- duration (integer)
- thumbnail_url (text)
- created_at (timestamptz)
```

#### **chat_message_reactions**
```sql
- id (uuid, PK)
- message_id (uuid, FK → chat_messages)
- user_id (uuid)
- emoji (text)
- created_at (timestamptz)
```

#### **chat_message_read_receipts**
```sql
- id (uuid, PK)
- message_id (uuid, FK → chat_messages)
- user_id (uuid)
- read_at (timestamptz)
```

#### **chat_typing_indicators**
```sql
- id (uuid, PK)
- room_id (uuid, FK → chat_rooms)
- user_id (uuid)
- started_at (timestamptz)
```

#### **chat_calls**
```sql
- id (uuid, PK)
- room_id (uuid, FK → chat_rooms)
- call_type (text: voice, video)
- initiated_by (uuid)
- status (text: ringing, active, ended, missed, declined)
- started_at (timestamptz)
- ended_at (timestamptz)
- duration (integer)
```

#### **chat_call_participants**
```sql
- id (uuid, PK)
- call_id (uuid, FK → chat_calls)
- user_id (uuid)
- joined_at (timestamptz)
- left_at (timestamptz)
- status (text: invited, joined, declined, left)
```

---

## Feature Comparison

### What's Included vs WhatsApp

| Feature | This System | WhatsApp | Notes |
|---------|-------------|----------|-------|
| Text Messages | ✓ | ✓ | Full support |
| Image Sharing | ✓ | ✓ | Up to 50MB |
| File Sharing | ✓ | ✓ | Multiple formats |
| Voice Notes | ✓ | ✓ | Audio recording |
| Voice Calls | ✓ | ✓ | WebRTC based |
| Video Calls | ✓ | ✓ | WebRTC based |
| Group Chat | ✓ | ✓ | Unlimited groups |
| Private Chat | ✓ | ✓ | 1-on-1 messaging |
| Read Receipts | ✓ | ✓ | Double check marks |
| Typing Indicators | ✓ | ✓ | Real-time |
| Message Editing | ✓ | ✓ | With indicator |
| Message Deletion | ✓ | ✓ | Soft delete |
| Reactions | ✓ | ✓ | Emoji reactions |
| Message Replies | ✓ | ✓ | Thread support |
| Online Status | ✓ | ✓ | Real-time presence |
| Company-Scoped | ✓ | ✗ | Enterprise feature |
| Subscription Tiers | ✓ | ✗ | Business model |
| Storage Management | ✓ | ✗ | Tier-based limits |
| User Role Management | ✓ | ✗ | Admin/Member roles |

---

## Security Features

### Row Level Security (RLS)

All tables have RLS policies that ensure:
- Users can only access data from their company
- Room members can only view their room's messages
- Only message senders can edit/delete their messages
- Company admins control subscription settings
- Proper authentication required for all operations

### Authentication

- JWT-based authentication for HTTP APIs
- Token-based authentication for WebSocket connections
- Role-based access control (Owner, Admin, Member)
- Session management and timeout handling

### Data Privacy

- Private chats are only visible to participants
- Media files organized by room for isolation
- Soft delete for messages (preserves history)
- Automatic cleanup of old typing indicators

---

## Best Practices

### Using the Chat System

1. **Create rooms purposefully**: Use company-wide for announcements, groups for teams, private for 1-on-1
2. **Manage permissions**: Assign admin roles to trusted members
3. **Monitor storage**: Keep track of media uploads against subscription limits
4. **Use reactions**: Quick feedback without cluttering chat
5. **Leverage read receipts**: Know when important messages are seen

### Managing Subscriptions

1. **Start with appropriate tier**: Choose based on team size and needs
2. **Monitor user count**: Upgrade before hitting limits
3. **Yearly saves money**: 2 months free with annual billing
4. **Review features**: Check feature access before upgrading
5. **Plan ahead**: Subscriptions auto-renew at end date

### WebSocket Best Practices

1. **Reconnect on disconnect**: Implement automatic reconnection
2. **Handle errors gracefully**: Show user-friendly error messages
3. **Optimize events**: Don't send unnecessary typing indicators
4. **Batch operations**: Use HTTP API for bulk operations
5. **Monitor connection**: Show connection status to users

---

## Troubleshooting

### Common Issues

**Q: Chat messages not appearing in real-time?**
- Check WebSocket connection status
- Verify JWT token is valid
- Ensure user is member of the room

**Q: File upload failing?**
- Check file size (max 50MB)
- Verify file type is supported
- Ensure storage limit not exceeded

**Q: Cannot add users to company?**
- Check subscription user limit
- Verify admin permissions
- Ensure user ID is valid

**Q: Call not connecting?**
- Check WebRTC compatibility
- Verify firewall/NAT settings
- Ensure proper signaling

---

## Support & Maintenance

### Monitoring

Monitor these key metrics:
- WebSocket connection count
- Message delivery latency
- Storage usage per company
- Active users per company
- Call success rate

### Maintenance Tasks

Regular maintenance should include:
- Cleanup old typing indicators (auto: every 10 seconds)
- Monitor subscription expiration dates
- Review storage usage patterns
- Check call quality metrics
- Update subscription pricing as needed

---

## Future Enhancements

Potential features for future versions:
- Message search functionality
- Voice message transcription
- Screen sharing in video calls
- Message forwarding
- Broadcast messages
- Rich text formatting
- Link previews
- Message scheduling
- Auto-delete messages
- Chat export functionality

---

## Conclusion

This system provides a complete enterprise-grade subscription and chat solution with:
- 3 flexible subscription tiers
- WhatsApp-like chat features
- Real-time communication
- Secure data handling
- Comprehensive API coverage
- Scalable architecture

For additional support or questions, contact the development team.
