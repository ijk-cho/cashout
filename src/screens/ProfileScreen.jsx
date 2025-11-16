import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import ProfilePage from '../ProfilePage';

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { user, gameHistory } = useGame();

  const handleUpdateProfile = (updates) => {
    // Profile updates would be handled through Firebase
    console.log('Profile updates:', updates);
    // TODO: Implement Firebase profile update
  };

  return (
    <ProfilePage
      user={user}
      gameHistory={gameHistory}
      onUpdateProfile={handleUpdateProfile}
      onBack={() => navigate('/')}
    />
  );
};

export default ProfileScreen;
