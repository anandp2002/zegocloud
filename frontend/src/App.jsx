import React, { useState, useEffect } from 'react';
import LobbyPage from './components/LobbyPage';
import PreviewScreen from './components/PreviewScreen';
import CallRoom from './components/CallRoom';
import { useZegoEngine } from './hooks/useZegoEngine';
import { fetchToken } from './services/tokenService';

export default function App() {
  const { engine: zg, isConfigured } = useZegoEngine();

  const [view, setView] = useState('lobby'); // 'lobby' | 'preview' | 'call'
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [userId] = useState(() => 'user_' + Math.random().toString(36).substring(2, 9));
  const [callToken, setCallToken] = useState('');

  const [activeStream, setActiveStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  // Check if roomId is in URL query (?room=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('roomId');
    if (roomParam) {
      setRoomId(roomParam);
    }
  }, []);

  // Step 1: Proceed from Lobby to Preview
  const handleProceedToPreview = ({ roomId: enteredRoomId, userName: enteredUserName }) => {
    setRoomId(enteredRoomId);
    setUserName(enteredUserName);
    setView('preview');

    const url = new URL(window.location.href);
    url.searchParams.set('room', enteredRoomId);
    window.history.replaceState({}, '', url.toString());
  };

  // Step 2: Join Call from Preview Screen
  const handleJoinCall = async ({ localStream, isMicOn: micState, isCameraOn: camState }) => {
    setActiveStream(localStream);
    setIsMicOn(micState);
    setIsCameraOn(camState);

    let token = '';
    if (zg && isConfigured) {
      try {
        console.log(`Fetching authentication token for ${userId} in room ${roomId}...`);
        token = await fetchToken(userId, roomId);
        console.log('Token acquired successfully.');
      } catch (err) {
        console.error('Failed to acquire token from backend server:', err);
        throw new Error(
          err.message || 'Failed to authenticate with token server. Make sure backend is running.'
        );
      }
    } else {
      console.warn('ZegoCloud engine not configured. Entering offline test mode.');
    }

    setCallToken(token);
    setView('call');
  };

  // Step 3: Leave Call and return to Lobby
  const handleLeaveCall = () => {
    setView('lobby');
    setActiveStream(null);
    setCallToken('');

    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#080c14] text-slate-100 font-sans">
      {view === 'lobby' && (
        <LobbyPage
          initialRoomId={roomId}
          onProceedToPreview={handleProceedToPreview}
          isEngineConfigured={isConfigured}
        />
      )}

      {view === 'preview' && (
        <PreviewScreen
          roomId={roomId}
          userName={userName}
          zg={zg}
          onJoinCall={handleJoinCall}
          onBack={() => setView('lobby')}
        />
      )}

      {view === 'call' && (
        <CallRoom
          roomId={roomId}
          userName={userName}
          userId={userId}
          zg={zg}
          token={callToken}
          initialStream={activeStream}
          initialMicOn={isMicOn}
          initialCameraOn={isCameraOn}
          onLeaveCall={handleLeaveCall}
        />
      )}
    </div>
  );
}
