import React, { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import ServerSidebar from '../components/ServerSidebar';
import ChannelSidebar from '../components/ChannelSidebar';
import ChatArea from '../components/ChatArea';
import VoiceArea from '../components/VoiceArea';
import DMSidebar from '../components/DMSidebar';
import MembersList from '../components/MembersList';
import FriendsPage from '../components/FriendsPage';
import useStore from '../store/useStore';
import api from '../utils/api';

const MainApp = () => {
  const { setServers, setFriends, setDMs, activeServer, activeChannel, activeDM, user } = useStore();
  useSocket();

  useEffect(() => {
    if (!user) return;
    Promise.all([api.get('/servers'), api.get('/friends'), api.get('/dms')]).then(([s, f, d]) => {
      setServers(s.data); setFriends(f.data); setDMs(d.data);
    }).catch(console.error);
  }, [user]);

  return (
    <div className="flex h-screen overflow-hidden">
      <ServerSidebar />
      {activeServer ? (
        <>
          <ChannelSidebar />
          <div className="flex flex-1 overflow-hidden">
            {activeChannel ? (
              activeChannel.type === 'voice' ? (
                <><VoiceArea channelId={activeChannel.id} channelName={activeChannel.name} /><MembersList /></>
              ) : (
                <><ChatArea /><MembersList /></>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: 'rgba(240,226,222,0.4)' }}>
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-30">⚡</div>
                  <p className="font-medium">Select a channel to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <DMSidebar />
          <div className="flex-1 overflow-hidden">{activeDM ? <ChatArea isDM /> : <FriendsPage />}</div>
        </>
      )}
    </div>
  );
};
export default MainApp;
