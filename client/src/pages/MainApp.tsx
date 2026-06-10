import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import Navigator from '../components/Navigator';
import TopBar from '../components/TopBar';
import ChatArea from '../components/ChatArea';
import VoiceArea from '../components/VoiceArea';
import MembersList from '../components/MembersList';
import FriendsPage from '../components/FriendsPage';
import useStore from '../store/useStore';
import api from '../utils/api';

const MainApp = () => {
  const { setServers, setFriends, setDMs, activeServer, activeChannel, activeDM, user } = useStore();
  const [showMembers, setShowMembers] = useState(true);
  useSocket();

  useEffect(() => {
    if (!user) return;
    Promise.all([api.get('/servers'), api.get('/friends'), api.get('/dms')]).then(([s, f, d]) => {
      setServers(s.data); setFriends(f.data); setDMs(d.data);
    }).catch(console.error);
  }, [user]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar showMembers={showMembers} onToggleMembers={() => setShowMembers(v => !v)} />
      <div className="flex flex-1 overflow-hidden">
        <Navigator />
        <div className="flex flex-1 overflow-hidden">
          {activeServer ? (
            activeChannel ? (
              activeChannel.type === 'voice'
                ? <VoiceArea channelId={activeChannel.id} channelName={activeChannel.name} />
                : <ChatArea />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center select-none">
                  <div className="text-6xl mb-4" style={{ opacity: 0.12 }}>⚡</div>
                  <p className="font-medium text-sm" style={{ color: 'rgba(240,226,222,0.35)' }}>
                    Select a channel to get started
                  </p>
                </div>
              </div>
            )
          ) : (
            activeDM ? <ChatArea isDM /> : <FriendsPage />
          )}
          {activeServer && showMembers && <MembersList />}
        </div>
      </div>
    </div>
  );
};

export default MainApp;
