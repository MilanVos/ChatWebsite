import React, { useEffect, useRef, useState, useCallback } from 'react';
import useStore from '../store/useStore';
import { getSocket } from '../hooks/useSocket';

const STUN_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

interface Props {
  channelId: string;
  channelName: string;
}

const VoiceArea: React.FC<Props> = ({ channelId, channelName }) => {
  const { user, voiceChannelId, voiceParticipants, setVoiceChannel, addVoiceParticipant, removeVoiceParticipant, setVoiceParticipants } = useStore();
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const joined = voiceChannelId === channelId;
  const participants = voiceParticipants[channelId] || [];

  const createPeer = useCallback((peerId: string, initiator: boolean): RTCPeerConnection => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    peersRef.current.set(peerId, pc);

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (e) => {
      let audio = audioRefs.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioRefs.current.set(peerId, audio);
      }
      audio.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket()?.emit('voice:ice-candidate', { to: peerId, candidate: e.candidate });
      }
    };

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        getSocket()?.emit('voice:offer', { to: peerId, offer });
      });
    }

    return pc;
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onExistingPeers = ({ channel_id, peers }: { channel_id: string; peers: string[] }) => {
      if (channel_id !== channelId) return;
      peers.forEach(peerId => {
        if (peerId !== user?.id && !peersRef.current.has(peerId)) {
          createPeer(peerId, true);
        }
      });
    };

    const onOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      let pc = peersRef.current.get(from);
      if (!pc) pc = createPeer(from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice:answer', { to: from, answer });
    };

    const onAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIceCandidate = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    socket.on('voice:existing-peers', onExistingPeers);
    socket.on('voice:offer', onOffer);
    socket.on('voice:answer', onAnswer);
    socket.on('voice:ice-candidate', onIceCandidate);

    return () => {
      socket.off('voice:existing-peers', onExistingPeers);
      socket.off('voice:offer', onOffer);
      socket.off('voice:answer', onAnswer);
      socket.off('voice:ice-candidate', onIceCandidate);
    };
  }, [channelId, createPeer, user?.id]);

  const joinVoice = async () => {
    setConnecting(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setVoiceChannel(channelId);
      if (user) addVoiceParticipant(channelId, { id: user.id, username: user.username, avatar: user.avatar });
      getSocket()?.emit('voice:join', channelId);
    } catch {
      setError('Microphone access denied. Please allow microphone access.');
    } finally {
      setConnecting(false);
    }
  };

  const leaveVoice = () => {
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    audioRefs.current.forEach(a => { a.srcObject = null; });
    audioRefs.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setVoiceChannel(null);
    setVoiceParticipants(channelId, []);
    if (user) removeVoiceParticipant(channelId, user.id);
    getSocket()?.emit('voice:leave');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = muted; });
      setMuted(m => !m);
    }
  };

  const toggleDeafen = () => {
    audioRefs.current.forEach(a => { a.muted = !deafened; });
    setDeafened(d => !d);
  };

  useEffect(() => {
    return () => {
      if (voiceChannelId === channelId) leaveVoice();
    };
  }, []);

  const allParticipants = joined && user
    ? [{ id: user.id, username: user.username, avatar: user.avatar }, ...participants.filter(p => p.id !== user.id)]
    : participants;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-discord-light">
      <div className="h-12 flex items-center px-4 border-b border-discord-darker shadow-sm flex-shrink-0 gap-3">
        <svg className="w-5 h-5 text-discord-text-muted flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
        </svg>
        <span className="text-white font-bold text-sm">{channelName}</span>
        {joined && (
          <span className="ml-2 text-xs text-discord-green font-medium bg-discord-green/20 px-2 py-0.5 rounded-full">
            Connected
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {!joined ? (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-discord-gray flex items-center justify-center mb-6 mx-auto">
              <svg className="w-10 h-10 text-discord-text-muted" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">{channelName}</h2>
            <p className="text-discord-text-muted text-sm mb-6">
              {participants.length === 0
                ? 'No one is in this voice channel yet.'
                : `${participants.length} ${participants.length === 1 ? 'person' : 'people'} connected`}
            </p>
            {error && (
              <div className="bg-red-500/20 text-red-400 text-sm rounded px-4 py-2 mb-4">{error}</div>
            )}
            <button
              onClick={joinVoice}
              disabled={connecting}
              className="bg-discord-green hover:bg-discord-green/80 text-white px-8 py-3 rounded-full font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
              {connecting ? 'Connecting...' : 'Join Voice'}
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {allParticipants.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-2 bg-discord-gray rounded-xl p-4">
                  <div className="relative">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.username} className="w-16 h-16 rounded-full" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-discord-accent flex items-center justify-center text-white text-2xl font-bold">
                        {p.username[0].toUpperCase()}
                      </div>
                    )}
                    {p.id === user?.id && muted && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-discord-red rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="text-white text-sm font-medium truncate max-w-full">
                    {p.username}{p.id === user?.id ? ' (You)' : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleMute}
                title={muted ? 'Unmute' : 'Mute'}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-discord-red hover:bg-discord-red/80' : 'bg-discord-lighter hover:bg-discord-lighter/80'}`}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  {muted ? (
                    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                  ) : (
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                  )}
                </svg>
              </button>

              <button
                onClick={leaveVoice}
                title="Leave Voice"
                className="w-12 h-12 rounded-full bg-discord-red hover:bg-discord-red/80 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>

              <button
                onClick={toggleDeafen}
                title={deafened ? 'Undeafen' : 'Deafen'}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${deafened ? 'bg-discord-red hover:bg-discord-red/80' : 'bg-discord-lighter hover:bg-discord-lighter/80'}`}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  {deafened ? (
                    <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm4 12.5a.5.5 0 01-1 0v-5a4 4 0 00-6 0v5a.5.5 0 01-1 0v-5a5 5 0 0110 0v5z" />
                  ) : (
                    <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 18c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v4.59L14.41 16 16 14.41l-3-3V8z" />
                  )}
                </svg>
              </button>
            </div>

            <p className="text-center text-discord-text-muted text-xs mt-4">
              {muted ? '🔇 Muted' : '🎤 Speaking'} · {deafened ? '🔕 Deafened' : '🔊 Hearing'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceArea;
