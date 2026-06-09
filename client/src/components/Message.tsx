import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import useStore from '../store/useStore';
import api from '../utils/api';

interface Attachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  content_type?: string;
}

interface Reaction {
  emoji: string;
  count: string;
  reacted: boolean;
}

interface MessageData {
  id: string;
  channel_id: string;
  user_id: string;
  content?: string;
  username?: string;
  avatar?: string;
  discriminator?: string;
  created_at: string;
  edited_at?: string;
  pinned?: boolean;
  reply_to?: string;
  reply_content?: string;
  reply_username?: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  isGrouped?: boolean;
}

interface Props {
  message: MessageData;
  isDM: boolean;
  channelId: string;
  onReply: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];

const Message: React.FC<Props> = ({ message, isDM, channelId, onReply }) => {
  const user = useStore(s => s.user);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hovered, setHovered] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const isOwn = message.user_id === user?.id;

  useEffect(() => {
    setEditContent(message.content || '');
  }, [message.content]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    try {
      const endpoint = isDM
        ? `/dms/${channelId}/messages/${message.id}`
        : `/channels/${channelId}/messages/${message.id}`;
      await api.patch(endpoint, { content: editContent });
      setEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const endpoint = isDM
        ? `/dms/${channelId}/messages/${message.id}`
        : `/channels/${channelId}/messages/${message.id}`;
      await api.delete(endpoint);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReact = async (emoji: string) => {
    setShowEmojiPicker(false);
    try {
      await api.post(`/channels/${channelId}/messages/${message.id}/react`, { emoji });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className={`group relative flex px-4 hover:bg-white/[0.02] ${message.isGrouped ? 'py-0.5' : 'pt-4 pb-0.5'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-10 mr-3 flex-shrink-0 mt-0.5">
        {!message.isGrouped ? (
          message.avatar ? (
            <img src={message.avatar} alt={message.username} className="w-10 h-10 rounded-full cursor-pointer hover:opacity-90" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-discord-accent flex items-center justify-center text-white font-bold text-sm cursor-pointer">
              {(message.username || '?')[0].toUpperCase()}
            </div>
          )
        ) : (
          hovered && (
            <span className="text-discord-text-muted text-[10px] leading-none mt-2 block text-right select-none">
              {format(new Date(message.created_at), 'h:mm a')}
            </span>
          )
        )}
      </div>

      <div className="flex-1 min-w-0">
        {!message.isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-white font-medium text-sm hover:underline cursor-pointer">{message.username}</span>
            <span className="text-discord-text-muted text-xs">
              {format(new Date(message.created_at), 'MM/dd/yyyy h:mm a')}
            </span>
            {message.edited_at && (
              <span className="text-discord-text-muted text-[10px]">(edited)</span>
            )}
          </div>
        )}

        {message.reply_to && (
          <div className="flex items-center gap-2 mb-1 text-discord-text-muted text-xs opacity-80 hover:opacity-100 cursor-pointer">
            <svg className="w-4 h-4 flex-shrink-0 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="font-semibold text-discord-text-dim">{message.reply_username}</span>
            <span className="truncate">{message.reply_content || 'Original message'}</span>
          </div>
        )}

        {editing ? (
          <div className="flex flex-col gap-1">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-full bg-discord-lighter text-discord-text rounded px-3 py-2 text-sm focus:outline-none resize-none"
              rows={2}
              autoFocus
            />
            <div className="text-xs text-discord-text-muted">
              <span>escape to </span>
              <button onClick={() => setEditing(false)} className="text-discord-accent hover:underline">cancel</button>
              <span> · enter to </span>
              <button onClick={handleEdit} className="text-discord-accent hover:underline">save</button>
            </div>
          </div>
        ) : (
          message.content && (
            <p className="text-discord-text text-sm break-words whitespace-pre-wrap leading-relaxed">{message.content}</p>
          )
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            {message.attachments.map(att => (
              <div key={att.id}>
                {att.content_type?.startsWith('image/') ? (
                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={att.url}
                      alt={att.filename}
                      className="max-w-sm max-h-72 rounded object-contain cursor-pointer hover:opacity-90"
                    />
                  </a>
                ) : (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-discord-dark rounded p-3 max-w-xs hover:bg-discord-darker transition-colors border border-discord-lighter"
                  >
                    <div className="text-2xl">📎</div>
                    <div className="min-w-0">
                      <div className="text-discord-accent text-sm truncate hover:underline">{att.filename}</div>
                      <div className="text-discord-text-muted text-xs">{(att.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map(r => (
              <button
                key={r.emoji}
                onClick={() => handleReact(r.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors
                  ${r.reacted
                    ? 'bg-discord-accent/20 border-discord-accent text-discord-accent'
                    : 'bg-discord-dark border-discord-lighter text-discord-text-muted hover:border-discord-text-muted'
                  }`}
              >
                <span>{r.emoji}</span>
                <span className="text-xs font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {hovered && !editing && (
        <div className="absolute right-4 -top-4 flex items-center gap-0.5 bg-discord-gray border border-discord-lighter rounded-md shadow-lg z-10">
          <ActionBtn title="Reply" onClick={onReply}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </ActionBtn>
          <div className="relative" ref={emojiRef}>
            <ActionBtn title="React" onClick={() => setShowEmojiPicker(v => !v)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </ActionBtn>
            {showEmojiPicker && (
              <div className="absolute right-0 top-8 bg-discord-dark border border-discord-lighter rounded-lg p-2 flex gap-1 z-50 shadow-xl">
                {COMMON_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => handleReact(e)}
                    className="hover:bg-discord-lighter p-1.5 rounded text-xl transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isOwn && (
            <ActionBtn title="Edit" onClick={() => setEditing(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </ActionBtn>
          )}
          {isOwn && (
            <ActionBtn title="Delete" onClick={handleDelete} danger>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  );
};

interface ActionBtnProps {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}

const ActionBtn: React.FC<ActionBtnProps> = ({ title, onClick, danger, children }) => (
  <button
    title={title}
    onClick={onClick}
    className={`p-1.5 rounded transition-colors ${danger ? 'text-discord-text-muted hover:text-discord-red hover:bg-discord-red/10' : 'text-discord-text-muted hover:text-white hover:bg-discord-lighter'}`}
  >
    {children}
  </button>
);

export default Message;
