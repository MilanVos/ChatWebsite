import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import api from '../utils/api';
import { getSocket } from '../hooks/useSocket';

interface ReplyTo {
  id: string;
  username?: string;
}

interface Props {
  channelId: string;
  isDM: boolean;
  channelName: string;
  replyTo: ReplyTo | null;
  onReplyClear: () => void;
}

const MessageInput: React.FC<Props> = ({ channelId, isDM, channelName, replyTo, onReplyClear }) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const emitTyping = (typing: boolean) => {
    const socket = getSocket();
    if (!socket || isDM) return;
    if (typing && !isTypingRef.current) {
      socket.emit('typing:start', { channel_id: channelId });
      isTypingRef.current = true;
    }
    if (!typing && isTypingRef.current) {
      socket.emit('typing:stop', { channel_id: channelId });
      isTypingRef.current = false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    emitTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => emitTyping(false), 3000);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    if (!content.trim() && attachments.length === 0) return;
    setSending(true);
    emitTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    try {
      if (isDM) {
        await api.post(`/dms/${channelId}/messages`, { content: content.trim() });
      } else {
        const formData = new FormData();
        formData.append('channel_id', channelId);
        if (content.trim()) formData.append('content', content.trim());
        if (replyTo) formData.append('reply_to', replyTo.id);
        attachments.forEach(f => formData.append('attachments', f));
        await api.post('/messages', formData);
      }
      setContent('');
      setAttachments([]);
      onReplyClear();
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setContent(c => c + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-discord-lighter rounded-lg">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-discord-lighter">
          {attachments.map((f, i) => (
            <div key={i} className="relative flex items-center gap-2 bg-discord-dark rounded px-3 py-2 text-sm">
              <span className="text-discord-text-dim">📎</span>
              <span className="text-discord-text text-xs max-w-[120px] truncate">{f.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="text-discord-text-muted hover:text-discord-red ml-1 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-discord-text-muted hover:text-discord-text transition-colors flex-shrink-0"
          title="Attach File"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${isDM ? '' : '#'}${channelName}`}
          rows={1}
          disabled={sending}
          className="flex-1 bg-transparent text-discord-text placeholder-discord-text-muted resize-none py-3 focus:outline-none text-sm leading-relaxed max-h-48 disabled:opacity-60"
        />

        <div className="flex items-center pr-2 flex-shrink-0 gap-0.5" ref={emojiRef}>
          <button
            onClick={() => setShowEmoji(v => !v)}
            className="p-2 text-discord-text-muted hover:text-discord-text transition-colors"
            title="Emoji"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmoji && (
            <div className="absolute bottom-20 right-4 z-50">
              <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} />
            </div>
          )}

          <button
            onClick={send}
            disabled={sending || (!content.trim() && attachments.length === 0)}
            className="p-2 text-discord-accent hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Send"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
