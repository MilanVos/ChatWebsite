import React, { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import ServerSidebar from '../components/ServerSidebar';
import ChannelSidebar from '../components/ChannelSidebar';
import ChatArea from '../components/ChatArea';
import DMSidebar from '../components/DMSidebar';
import MembersList from '../components/MembersList';
import FriendsPage from '../components/FriendsPage';
import useStore from '../store/useStore';
import api from '../utils/api';

const MainApp = () => {
  const { setServers, setFriends, setDMs, activeServer, activeChannel, activeDM, user } = useStore();
  useSocket();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [serversRes, friendsRes, dmsRes] = await Promise.all([
          api.get('/servers'),
          api.get('/friends'),
          api.get('/dms')
        ]);
        setServers(serversRes.data);
        setFriends(friendsRes.data);
        setDMs(dmsRes.data);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    if (user) fetchInitialData();
  }, [user]);

  return (
    <div className="flex h-screen bg-discord-light overflow-hidden">
      <ServerSidebar />
      {activeServer ? (
        <>
          <ChannelSidebar />
          <div className="flex flex-1 overflow-hidden">
            {activeChannel ? (
              <>
                <ChatArea />
                <MembersList />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-discord-text-muted">
                <div className="text-center">
                  <div className="text-6xl mb-4">👋</div>
                  <p className="text-lg">Select a channel to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <DMSidebar />
          <div className="flex-1 overflow-hidden">
            {activeDM ? <ChatArea isDM /> : <FriendsPage />}
          </div>
        </>
      )}
    </div>
  );
};

export default MainApp;
