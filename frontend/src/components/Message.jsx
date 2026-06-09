import React, { useState, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import useStore from '../store/useStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const formatTime = (date) => {
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, 'HH:mm')}`;
  return format(d, 'dd/MM/yyyy HH:mm');
};

const Avatar = ({ user, size = 'md' }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm' };
  return user?.avatar ? (
    <img
      src={`${BACKEND_URL}${user.avatar}`}
      alt=""
      className={`${sizes[size]} rounded-full flex-shrink-0`}
    />
  ) : (
    <div className={`${sizes[size]} rounded-full bg-discord-accent flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {user?.username?.charAt(0).toUpperCase()}
    </div>
  );
};

const Message = ({ message, isDM, channelId, onReply }) => {
  const { user, updateMessage, deleteMessage, updateMessageReactions } = useStore();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isOwn = message.user_id === user?.id;
  const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setEditing(false);
      return;
    }
    try {
      await api.patch(`/messages/${message.id}`, { content: editContent });
      setEditing(false);
    } catch {
      toast.error('Failed to edit message');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return;
    try {
      if (isDM) {
        await api.delete(`/dms/${channelId}/messages/${message.id}`);
      } else {
        await api.delete(`/messages/${message.id}`);
      }
    } catch {
      toast.error('Failed to delete message');
    }
    setShowMenu(false);
  };

  const handleReaction = async (emoji) => {
    if (isDM) return;
    try {
      const res = await api.post(`/messages/${message.id}/reactions`, { emoji: emoji.emoji });
      updateMessageReactions(channelId, message.id, res.data);
    } catch {
      toast.error('Failed to react');
    }
    setShowEmoji(false);
  };

  const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div
      className={`relative px-4 py-0.5 group message-enter ${hovered ? 'bg-[rgba(4,4,5,0.07)]' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); setShowEmoji(false); }}
    >
      {message.reply_to && message.reply_username && (
        <div className="flex items-center gap-2 ml-14 mb-1 text-discord-text-muted text-xs">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span className="font-semibold text-discord-text-dim">{message.reply_username}</span>
          <span className="truncate max-w-xs">{message.reply_content}</span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {!message.isGrouped ? (
          <Avatar user={{ username: message.username, avatar: message.avatar }} />
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {!message.isGrouped && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-white font-semibold hover:underline cursor-pointer text-sm">
                {message.username}
              </span>
              <span className="text-discord-text-muted text-xs">{formatTime(message.created_at)}</span>
              {message.edited_at && (
                <span className="text-discord-text-muted text-xs">(edited)</span>
              )}
            </div>
          )}

          {editing ? (
            <div className="mt-1">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } if (e.key === 'Escape') setEditing(false); }}
                className="w-full bg-discord-lighter text-white rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-discord-accent"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 mt-1 text-xs text-discord-text-muted">
                <button onClick={handleEdit} className="text-discord-accent hover:underline">Save</button>
                <button onClick={() => setEditing(false)} className="hover:underline">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {message.content && (
                <p className="text-discord-text text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
              )}

              {message.attachments?.map((att, i) => (
                <div key={att.id || i} className="mt-2">
                  {isImage(att.url) ? (
                    <img
                      src={`${BACKEND}${att.url}`}
                      alt={att.filename}
                      className="max-w-sm max-h-64 rounded cursor-pointer hover:opacity-90 transition-opacity object-cover"
                      onClick={() => window.open(`${BACKEND}${att.url}`, '_blank')}
                    />
                  ) : (
                    <a
                      href={`${BACKEND}${att.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-discord-gray p-3 rounded max-w-xs hover:bg-discord-lighter transition-colors"
                    >
                      <svg className="w-6 h-6 text-discord-accent" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                      </svg>
                      <div>
                        <p className="text-discord-accent text-sm font-medium hover:underline">{att.filename}</p>
                        <p className="text-discord-text-muted text-xs">{(att.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </a>
                  )}
                </div>
              ))}

              {message.reactions?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {message.reactions.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => !isDM && api.post(`/messages/${message.id}/reactions`, { emoji: r.emoji }).then(res => updateMessageReactions(channelId, message.id, res.data))}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors
                        ${r.reacted ? 'bg-discord-accent/20 border-discord-accent/50' : 'bg-discord-gray border-discord-lighter hover:bg-discord-lighter'}`}
                    >
                      <span>{r.emoji}</span>
                      <span className="text-xs text-discord-text">{r.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {hovered && !editing && (
        <div className="absolute right-4 top-0 -translate-y-1/2 bg-discord-darker border border-discord-lighter rounded flex items-center shadow-lg">
          {!isDM && (
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-1.5 hover:bg-discord-lighter rounded text-discord-text-muted hover:text-white transition-colors"
              title="Add Reaction"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={onReply}
            className="p-1.5 hover:bg-discord-lighter rounded text-discord-text-muted hover:text-white transition-colors"
            title="Reply"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          {isOwn && !isDM && (
            <button
              onClick={() => { setEditing(true); setShowMenu(false); }}
              className="p-1.5 hover:bg-discord-lighter rounded text-discord-text-muted hover:text-white transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {isOwn && (
            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-discord-lighter rounded text-discord-text-muted hover:text-discord-red transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}

      {showEmoji && (
        <div className="absolute right-0 z-50" style={{ bottom: '100%' }}>
          <EmojiPicker
            onEmojiClick={handleReaction}
            theme="dark"
            width={320}
            height={400}
          />
        </div>
      )}
    </div>
  );
};

export default Message;
