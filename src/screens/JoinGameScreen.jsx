import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import {
  PrimaryButton,
  GhostButton,
  PremiumCard,
  PremiumInput,
  CodeInput,
} from '../components/PremiumUI';

const JoinGameScreen = () => {
  const navigate = useNavigate();
  const {
    inputCode,
    setInputCode,
    playerName,
    setPlayerName,
    venmoUsername,
    setVenmoUsername,
    joinGameHandler,
    resetApp,
  } = useGame();

  const handleJoinGame = async () => {
    const result = await joinGameHandler();
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

        <h2 className="text-3xl font-bold mb-6 text-[#F8FAFC]">Join Game</h2>

        <PremiumCard className="p-6 mb-6">
          <div className="mb-4">
            <label className="block text-[#CBD5E1] text-sm font-medium mb-2 uppercase tracking-wide">
              Game Code
            </label>
            <CodeInput
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
          </div>

          <PremiumInput
            label="Your Name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
          />

          <div className="mt-4">
            <PremiumInput
              label="Venmo Username (Optional)"
              type="text"
              value={venmoUsername}
              onChange={(e) => setVenmoUsername(e.target.value)}
              placeholder="@username"
            />
          </div>
        </PremiumCard>

        <div className="space-y-3">
          <PrimaryButton
            onClick={handleJoinGame}
            disabled={!inputCode.trim() || !playerName.trim()}
          >
            Join Game
          </PrimaryButton>

          <GhostButton onClick={handleBack}>
            Cancel
          </GhostButton>
        </div>
      </div>
    </div>
  );
};

export default JoinGameScreen;
