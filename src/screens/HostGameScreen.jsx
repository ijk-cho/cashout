import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import {
  PrimaryButton,
  GhostButton,
  PremiumCard,
  PremiumInput,
} from '../components/PremiumUI';

const HostGameScreen = () => {
  const navigate = useNavigate();
  const {
    sessionName,
    setSessionName,
    playerName,
    setPlayerName,
    friends,
    inviteSelectedFriends,
    setInviteSelectedFriends,
    createGameHandler,
    resetApp,
  } = useGame();

  const handleCreateGame = async () => {
    const result = await createGameHandler();
    if (result && result.success) {
      navigate('/lobby');
    }
  };

  const handleBack = () => {
    resetApp();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="max-w-md mx-auto pt-8 relative z-10">
        <button
          onClick={handleBack}
          className="text-[#CBD5E1] hover:text-[#F8FAFC] mb-6 flex items-center gap-2 hover:bg-white/5 p-2 rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h2 className="text-3xl font-bold mb-6 text-[#F8FAFC]">Host Game</h2>

        <PremiumCard className="p-6 mb-6">
          <PremiumInput
            label="Session Name (Optional)"
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="e.g., Sunday Runs with the Boys"
          />

          <div className="mt-4">
            <PremiumInput
              label="Your Name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
        </PremiumCard>

        {/* Invite Friends */}
        {friends.length > 0 && (
          <PremiumCard className="p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[#CBD5E1] text-sm font-medium uppercase tracking-wide">
                Invite Friends
              </label>
              <span className="text-xs text-[#64748B]">
                {inviteSelectedFriends.length} selected
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {friends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => {
                    if (inviteSelectedFriends.includes(friend.id)) {
                      setInviteSelectedFriends(inviteSelectedFriends.filter(id => id !== friend.id));
                    } else {
                      setInviteSelectedFriends([...inviteSelectedFriends, friend.id]);
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                    inviteSelectedFriends.includes(friend.id)
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]'
                      : 'bg-[#1E2433] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    inviteSelectedFriends.includes(friend.id)
                      ? 'border-[#D4AF37] bg-[#D4AF37]'
                      : 'border-[#64748B]'
                  }`}>
                    {inviteSelectedFriends.includes(friend.id) && (
                      <Check size={14} className="text-[#0A0E14]" strokeWidth={3} />
                    )}
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-full flex items-center justify-center font-bold text-xs text-[#0A0E14]">
                    {friend.displayName?.[0]?.toUpperCase() || friend.email?.[0]?.toUpperCase() || 'F'}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-[#F8FAFC]">{friend.displayName || 'Player'}</div>
                    <div className="text-xs text-[#64748B]">{friend.email}</div>
                  </div>
                </button>
              ))}
            </div>
            {inviteSelectedFriends.length > 0 && (
              <div className="mt-3 text-xs text-[#D4AF37] bg-[#D4AF37]/10 p-2 rounded-lg">
                Selected friends will receive an in-app notification with the game code
              </div>
            )}
          </PremiumCard>
        )}

        <div className="space-y-3">
          <PrimaryButton
            onClick={handleCreateGame}
            disabled={!playerName.trim()}
          >
            Create Game {inviteSelectedFriends.length > 0 && `& Invite ${inviteSelectedFriends.length}`}
          </PrimaryButton>

          <GhostButton onClick={handleBack}>
            Cancel
          </GhostButton>
        </div>
      </div>
    </div>
  );
};

export default HostGameScreen;
