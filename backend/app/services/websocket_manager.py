from fastapi import WebSocket
from typing import Dict, List, Set, Optional
from datetime import datetime
import json
import asyncio


class ConnectionManager:
    """
    Manages WebSocket connections for live chat functionality.
    Supports:
    - User connections tracking
    - Broadcasting to conversations
    - Typing indicators
    - Online status updates
    - Read receipts
    """

    def __init__(self):
        # Map user_id to their WebSocket connections (user can have multiple tabs)
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Map conversation_id to set of user_ids currently in that conversation
        self.conversation_users: Dict[int, Set[int]] = {}
        # Map user_id to set of conversation_ids they're currently viewing
        self.user_conversations: Dict[int, Set[int]] = {}
        # Track typing users: {conversation_id: {user_id: timestamp}}
        self.typing_users: Dict[int, Dict[int, datetime]] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)

            if user_id not in self.user_conversations:
                self.user_conversations[user_id] = set()

        # Broadcast online status to relevant users
        await self.broadcast_online_status(user_id, True)

    async def disconnect(self, websocket: WebSocket, user_id: int):
        """Handle WebSocket disconnection"""
        async with self._lock:
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)

                # If no more connections, user is offline
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

                    # Clean up conversation subscriptions
                    if user_id in self.user_conversations:
                        for conv_id in self.user_conversations[user_id]:
                            if conv_id in self.conversation_users:
                                self.conversation_users[conv_id].discard(user_id)
                        del self.user_conversations[user_id]

                    # Clean up typing status
                    for conv_id in list(self.typing_users.keys()):
                        if user_id in self.typing_users[conv_id]:
                            del self.typing_users[conv_id][user_id]

                    # Broadcast offline status
                    await self.broadcast_online_status(user_id, False)

    async def subscribe_to_conversation(self, user_id: int, conversation_id: int):
        """Subscribe a user to receive updates for a conversation"""
        async with self._lock:
            if conversation_id not in self.conversation_users:
                self.conversation_users[conversation_id] = set()
            self.conversation_users[conversation_id].add(user_id)

            if user_id not in self.user_conversations:
                self.user_conversations[user_id] = set()
            self.user_conversations[user_id].add(conversation_id)

    async def unsubscribe_from_conversation(self, user_id: int, conversation_id: int):
        """Unsubscribe a user from a conversation"""
        async with self._lock:
            if conversation_id in self.conversation_users:
                self.conversation_users[conversation_id].discard(user_id)
            if user_id in self.user_conversations:
                self.user_conversations[user_id].discard(conversation_id)

    async def send_personal_message(self, user_id: int, message: dict):
        """Send a message to a specific user (all their connections)"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)

            # Clean up disconnected sockets
            for conn in disconnected:
                await self.disconnect(conn, user_id)

    async def broadcast_to_conversation(self, conversation_id: int, message: dict, exclude_user_id: Optional[int] = None):
        """Broadcast a message to all users in a conversation"""
        if conversation_id not in self.conversation_users:
            return

        # Make a copy of the set to avoid "Set changed size during iteration" error
        user_ids = list(self.conversation_users[conversation_id])
        for user_id in user_ids:
            if exclude_user_id and user_id == exclude_user_id:
                continue
            await self.send_personal_message(user_id, message)

    async def broadcast_to_users(self, user_ids: List[int], message: dict, exclude_user_id: Optional[int] = None):
        """Broadcast a message to specific users"""
        for user_id in user_ids:
            if exclude_user_id and user_id == exclude_user_id:
                continue
            await self.send_personal_message(user_id, message)

    async def broadcast_online_status(self, user_id: int, is_online: bool):
        """Broadcast user's online status to all their conversations"""
        message = {
            "type": "online_status",
            "user_id": user_id,
            "is_online": is_online,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Get all conversations this user is part of (make a copy to avoid iteration errors)
        if user_id in self.user_conversations:
            conv_ids = list(self.user_conversations[user_id])
            for conv_id in conv_ids:
                await self.broadcast_to_conversation(conv_id, message, exclude_user_id=user_id)

    async def set_typing(self, user_id: int, conversation_id: int, is_typing: bool):
        """Update typing status for a user in a conversation"""
        async with self._lock:
            if conversation_id not in self.typing_users:
                self.typing_users[conversation_id] = {}

            if is_typing:
                self.typing_users[conversation_id][user_id] = datetime.utcnow()
            else:
                self.typing_users[conversation_id].pop(user_id, None)

        # Broadcast typing status
        message = {
            "type": "typing",
            "conversation_id": conversation_id,
            "user_id": user_id,
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_conversation(conversation_id, message, exclude_user_id=user_id)

    async def send_new_message(self, conversation_id: int, message_data: dict, sender_id: int, participant_ids: List[int] = None):
        """Broadcast a new message to conversation participants"""
        message = {
            "type": "new_message",
            "conversation_id": conversation_id,
            "message": message_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        # First broadcast to subscribed users
        await self.broadcast_to_conversation(conversation_id, message)

        # Also send to all participants directly (in case they're not subscribed to this conversation yet)
        if participant_ids:
            for user_id in participant_ids:
                if user_id != sender_id and user_id not in self.conversation_users.get(conversation_id, set()):
                    await self.send_personal_message(user_id, message)

    async def send_message_read(self, conversation_id: int, message_id: int, user_id: int):
        """Broadcast message read receipt"""
        message = {
            "type": "message_read",
            "conversation_id": conversation_id,
            "message_id": message_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_conversation(conversation_id, message, exclude_user_id=user_id)

    async def send_reaction(self, conversation_id: int, message_id: int, user_id: int, emoji: str, action: str):
        """Broadcast reaction update"""
        message = {
            "type": "reaction",
            "conversation_id": conversation_id,
            "message_id": message_id,
            "user_id": user_id,
            "emoji": emoji,
            "action": action,  # "add" or "remove"
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_conversation(conversation_id, message)

    async def send_message_edited(self, conversation_id: int, message_data: dict):
        """Broadcast message edit"""
        message = {
            "type": "message_edited",
            "conversation_id": conversation_id,
            "message": message_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_conversation(conversation_id, message)

    async def send_message_deleted(self, conversation_id: int, message_id: int):
        """Broadcast message deletion"""
        message = {
            "type": "message_deleted",
            "conversation_id": conversation_id,
            "message_id": message_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_conversation(conversation_id, message)

    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is currently online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_users(self) -> List[int]:
        """Get list of all online user IDs"""
        return list(self.active_connections.keys())

    def get_online_users_in_conversation(self, conversation_id: int) -> List[int]:
        """Get list of online users in a specific conversation"""
        if conversation_id not in self.conversation_users:
            return []
        # Make a copy to avoid iteration errors
        user_ids = list(self.conversation_users[conversation_id])
        return [uid for uid in user_ids if self.is_user_online(uid)]


# Global connection manager instance
manager = ConnectionManager()
