import React, { useEffect, useRef, useState, useCallback } from 'react';
import useStore from '../store/useStore';
import api from '../utils/api';
import { getSocket } from '../hooks/useSocket';
import Message from './Message';
import MessageInput from './MessageInput';

interface Props {
  isDM?: boolean;
}

const ChatArea: React.FC<Props> = ({ isDM = false }) => {
  const { activeChannel, activeDM, messages, dmMessages, setMessages, setDMMessages, prependMessages, user } = useStore();
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);

  const channelId = isDM ? activeDM?.id : activeChannel?.id;
  const currentMessages = channelId
    ? (isDM ? (dmMessages[channelId] || []) : (messages[channelId] || []))
    : [];

  const fetchMessages = useCallback(async (before?: string) => {
    if (!channelId || loading) return;
    setLoading(true);
    try {
      const endpoint = isDM ? `/dms/${channelId}/messages` : `/messages/channel/${channelId}`;
      const res = await api.get(endpoint, { params: before ? { before, limit: 50 } : { limit: 50 } });
      const msgs: any[] = res.data;
      if (before) {
        if (containerRef.current) prevScrollHeight.current = containerRef.current.scrollHeight;
        prependMessages(channelId, msgs);
      } else {
        isDM ? setDMMessages(channelId, msgs) : setMessages(channelId, msgs);
      }
      setHasMore(msgs.length === 50);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [channelId, isDM]);

  useEffect(() => {
    if (!channelId) return;
    setHasMore(true);
    setReplyTo(null);
    fetchMessages();
    const socket = getSocket();
    if (socket && !isDM) socket.emit('channel:join', channelId);
    return () => {
      if (socket && !isDM) socket.emit('channel:leave', channelId);
    };
  }, [channelId]);

  useEffect(() => {
    if (prevScrollHeight.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop < 80 && hasMore && !loading) {
      fetchMessages(currentMessages[0]?.id);
    }
  };

  const groupedMessages = currentMessages.map((msg, i) => {
    const prev = currentMessages[i - 1];
    const isGrouped = !!(prev &&
      prev.user_id === msg.user_id &&
      !msg.reply_to &&
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000);
    return { ...msg, isGrouped };
  });

  const typingUsers = useStore(s => s.typingUsers[channelId || ''] || {});
  const typingList = Object.entries(typingUsers)
    .filter(([uid]) => uid !== user?.id)
    .map(([, name]) => name);

  const channelName = isDM ? activeDM?.username : activeChannel?.name;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-discord-light">
      <div className="h-12 flex items-center px-4 border-b border-discord-darker shadow-sm flex-shrink-0 gap-3">
        <span className="text-discord-text-muted font-bold text-lg">{isDM ? '' : '#'}</span>
        <span className="text-white font-bold text-sm">{channelName}</span>
        {!isDM && activeChannel?.topic && (
          <>
            <div className="w-px h-5 bg-discord-lighter" />
            <span className="text-discord-text-muted text-sm truncate">{activeChannel.topic}</span>
          </>
        )}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {loading && (
          <div className="flex justify-center py-4">
            <div className="text-discord-text-muted text-sm">Loading messages...</div>
          </div>
        )}
        {!hasMore && currentMessages.length > 0 && (
          <div className="px-4 py-8 border-b border-discord-lighter mb-4">
            <div className="text-white font-bold text-2xl">{isDM ? `@${channelName}` : `#${channelName}`}</div>
            <div className="text-discord-text-muted text-sm mt-1">
              {isDM ? `This is the beginning of your direct message history with @${channelName}.` : `This is the beginning of the #${channelName} channel.`}
            </div>
          </div>
        )}
        {groupedMessages.map(msg => (
          <Message
            key={msg.id}
            message={msg}
            isDM={isDM}
            channelId={channelId || ''}
            onReply={() => setReplyTo(msg)}
          />
        ))}
        <div ref={bottomRef} className="h-4" />
      </div>

      {typingList.length > 0 && (
        <div className="px-4 py-1 text-xs flex-shrink-0 flex items-center gap-1">
          <div className="flex gap-0.5 items-end mr-1">
            <span className="w-1 h-1 rounded-full bg-discord-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-discord-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-discord-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="font-semibold text-discord-text">{typingList.join(', ')}</span>
          <span className="text-discord-text-muted">{typingList.length === 1 ? ' is typing...' : ' are typing...'}</span>
        </div>
      )}

      <div className="px-4 pb-6 flex-shrink-0">
        {replyTo && (
          <div className="flex items-center bg-discord-gray rounded-t px-3 py-2 text-sm border-t-0 -mb-1">
            <span className="text-discord-text-muted">
              Replying to <span className="text-white font-medium">{replyTo.username}</span>
            </span>
            <button
              className="ml-auto text-discord-text-muted hover:text-white transition-colors"
              onClick={() => setReplyTo(null)}
            >
              ✕
            </button>
          </div>
        )}
        <MessageInput
          channelId={channelId || ''}
          isDM={isDM}
          channelName={channelName || ''}
          replyTo={replyTo}
          onReplyClear={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
};

export default ChatArea;
