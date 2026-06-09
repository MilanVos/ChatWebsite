import React, { useEffect, useRef, useState, useCallback } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { getSocket } from '../hooks/useSocket';
import Message from './Message';
import MessageInput from './MessageInput';
import { format } from 'date-fns';

const ChatArea = ({ isDM = false }) => {
  const { activeChannel, activeDM, messages, dmMessages, setMessages, setDMMessages, prependMessages, user, typingUsers } = useStore();
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const isFirstLoad = useRef(true);

  const channelId = isDM ? activeDM?.id : activeChannel?.id;
  const currentMessages = isDM ? (dmMessages[channelId] || []) : (messages[channelId] || []);
  const typing = typingUsers[channelId] || {};
  const typingNames = Object.values(typing).filter(Boolean);

  const fetchMessages = useCallback(async (before = null) => {
    if (!channelId || loading) return;
    setLoading(true);
    try {
      const endpoint = isDM
        ? `/dms/${channelId}/messages`
        : `/messages/channel/${channelId}`;
      const params = { limit: 50 };
      if (before) params.before = before;

      const res = await api.get(endpoint, { params });
      const msgs = res.data;

      if (before) {
        prependMessages(channelId, msgs);
        setHasMore(msgs.length === 50);
      } else {
        if (isDM) setDMMessages(channelId, msgs);
        else setMessages(channelId, msgs);
        setHasMore(msgs.length === 50);
        isFirstLoad.current = true;
      }
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [channelId, isDM]);

  useEffect(() => {
    if (channelId) {
      isFirstLoad.current = true;
      fetchMessages();
    }
  }, [channelId]);

  useEffect(() => {
    if (isFirstLoad.current && currentMessages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      isFirstLoad.current = false;
    } else if (!isFirstLoad.current) {
      const container = containerRef.current;
      const isNearBottom = container && (container.scrollHeight - container.scrollTop - container.clientHeight < 150);
      if (isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [currentMessages.length]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && hasMore && !loading) {
      const oldest = currentMessages[0];
      if (oldest) fetchMessages(oldest.id);
    }
  };

  const groupMessages = (msgs) => {
    const groups = [];
    let lastUserId = null;
    let lastTime = null;

    msgs.forEach((msg) => {
      const msgTime = new Date(msg.created_at);
      const timeDiff = lastTime ? (msgTime - lastTime) / 1000 / 60 : 999;
      const isGrouped = msg.user_id === lastUserId && timeDiff < 7 && !msg.reply_to;

      groups.push({ ...msg, isGrouped });
      lastUserId = msg.user_id;
      lastTime = msgTime;
    });

    return groups;
  };

  const groupedMessages = groupMessages(currentMessages);

  const channelName = isDM ? activeDM?.username : activeChannel?.name;

  return (
    <div className="flex flex-col flex-1 bg-discord-light overflow-hidden">
      <div className="h-12 px-4 flex items-center border-b border-discord-darker shadow-sm flex-shrink-0">
        <span className="text-discord-text-muted mr-2">
          {isDM ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.88 2.507L4.16 12h6.312L8.624 21.507l.023.01L17.839 9h-5.967l2.104-6.493z" />
            </svg>
          )}
        </span>
        <span className="text-white font-bold">{channelName}</span>
        {activeChannel?.topic && (
          <>
            <div className="w-px h-5 bg-discord-lighter mx-3" />
            <span className="text-discord-text-muted text-sm truncate">{activeChannel.topic}</span>
          </>
        )}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-0 py-4 messages-container"
      >
        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-discord-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!hasMore && (
          <div className="px-4 py-8 border-b border-discord-lighter mb-4">
            <div className="w-16 h-16 rounded-full bg-discord-accent flex items-center justify-center mb-4">
              <span className="text-2xl">#</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">Welcome to #{channelName}!</h3>
            <p className="text-discord-text-muted">This is the start of the #{channelName} channel.</p>
          </div>
        )}

        {groupedMessages.map((msg, idx) => (
          <Message
            key={msg.id}
            message={msg}
            isDM={isDM}
            channelId={channelId}
            onReply={() => setReplyTo(msg)}
          />
        ))}

        {typingNames.length > 0 && (
          <div className="px-4 py-1 text-discord-text-muted text-sm flex items-center gap-1">
            <div className="flex gap-0.5 mr-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 bg-discord-text-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span><strong>{typingNames.join(', ')}</strong> {typingNames.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="mx-4 mb-0 px-4 py-2 bg-discord-gray rounded-t flex items-center justify-between">
          <span className="text-discord-text-muted text-sm">
            Replying to <strong className="text-white">{replyTo.username}</strong>
          </span>
          <button onClick={() => setReplyTo(null)} className="text-discord-text-muted hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <MessageInput
        channelId={channelId}
        isDM={isDM}
        channelName={channelName}
        replyTo={replyTo}
        onReplyClear={() => setReplyTo(null)}
      />
    </div>
  );
};

export default ChatArea;
