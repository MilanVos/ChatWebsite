import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getSocket } from '../hooks/useSocket';
import useStore from '../store/useStore';
import EmojiPicker from 'emoji-picker-react';

const MessageInput = ({ channelId, isDM, channelName, replyTo, onReplyClear }) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const { user, activeDM } = useStore();

  const sendTyping = useCallback((stop = false) => {
    const socket = getSocket();
    if (!socket) return;
    if (stop) {
      socket.emit('typing:stop', { channel_id: channelId, is_dm: isDM });
      isTypingRef.current = false;
    } else if (!isTypingRef.current) {
      socket.emit('typing:start', { channel_id: channelId, is_dm: isDM });
      isTypingRef.current = true;
    }
  }, [channelId, isDM]);

  const handleInput = (e) => {
    setContent(e.target.value);
    if (e.target.value) {
      sendTyping();
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTyping(true), 3000);
    } else {
      sendTyping(true);
    }

    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleSend = async () => {
    if ((!content.trim() && !files.length) || sending) return;
    setSending(true);
    sendTyping(true);

    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      if (replyTo) formData.append('reply_to', replyTo.id);
      files.forEach(f => formData.append('attachments', f));

      if (isDM) {
        await api.post(`/dms/${channelId}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        formData.append('channel_id', channelId);
        await api.post('/messages', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setContent('');
      setFiles([]);
      onReplyClear?.();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles].slice(0, 10));
    e.target.value = '';
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const onEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    }
    setShowEmoji(false);
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, [channelId]);

  return (
    <div className="px-4 pb-6 pt-0 flex-shrink-0">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-discord-gray rounded-t">
          {files.map((file, idx) => (
            <div key={idx} className="relative bg-discord-lighter rounded p-2 flex items-center gap-2">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt="" className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="flex items-center gap-2 text-sm text-discord-text">
                  <svg className="w-6 h-6 text-discord-accent" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                  </svg>
                  <span className="truncate max-w-24">{file.name}</span>
                </div>
              )}
              <button
                onClick={() => removeFile(idx)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-discord-red rounded-full flex items-center justify-center text-white text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-discord-lighter rounded-lg flex items-end px-4 py-2 gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-discord-text-muted hover:text-white transition-colors p-1 flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${isDM ? activeDM?.username || '' : `#${channelName || ''}`}`}
          className="flex-1 bg-transparent text-discord-text placeholder-discord-text-muted resize-none focus:outline-none text-sm leading-6 max-h-48 overflow-y-auto"
          rows={1}
          style={{ minHeight: '24px' }}
        />

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="text-discord-text-muted hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmoji && (
            <div className="absolute bottom-10 right-0 z-50">
              <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" width={320} height={400} />
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!content.trim() && !files.length}
          className="text-discord-text-muted hover:text-white transition-colors p-1 disabled:opacity-40 flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
