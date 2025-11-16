import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Copy, Check } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import {
  DangerButton,
  PremiumCard,
  StatusBadge,
} from '../components/PremiumUI';

const GameLobbyScreen = () => {
  const navigate = useNavigate();
  const {
    gameCode,
    sessionName,
    players,
    currentPlayer,
    newGroupName,
    setNewGroupName,
    copied,
    copyCode,
    shareCode,
    startGame,
    kickPlayer,
    saveGroup,
    resetApp,
  } = useGame();

  const handleStartGame = async () => {
    await startGame();
    navigate('/game');
  };

  const handleLeaveGame = () => {
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
        <h2 className="text-3xl font-bold mb-6 text-[#F8FAFC]">Game Lobby</h2>

        {/* Game Code Card */}
        <PremiumCard className="p-6 mb-6">
          <div className="text-center">
            <div className="text-[#64748B] text-xs uppercase tracking-wider mb-3">
              Share Game Code
            </div>
            <div className="text-[#D4AF37] text-4xl font-mono font-bold tracking-[0.3em] mb-4 px-4 py-3 bg-[#12161F] rounded-xl border border-[#D4AF37]/20">
              {gameCode}
            </div>
            <div className="flex gap-2">
              <button
                onClick={shareCode}
                className="flex-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-medium py-2.5 px-4 rounded-xl hover:bg-[#D4AF37]/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                Share
              </button>
              <button
                onClick={copyCode}
                className="flex-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-medium py-2.5 px-4 rounded-xl hover:bg-[#D4AF37]/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </PremiumCard>

        {/* Session Name */}
        {sessionName && (
          <div className="text-center mb-4">
            <div className="inline-block bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] px-4 py-2 rounded-full text-sm italic">
              "{sessionName}"
            </div>
          </div>
        )}

        {/* Players List */}
        <PremiumCard className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#F8FAFC]">Players ({players.length})</h3>
            {currentPlayer?.isHost && players.length >= 2 && (
              <button
                onClick={handleStartGame}
                className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14] font-bold px-4 py-2 rounded-xl transition-all duration-200 text-sm hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)]"
              >
                Start Game
              </button>
            )}
          </div>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#12161F] p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-full flex items-center justify-center font-bold text-[#0A0E14] text-sm">
                    {p.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-[#F8FAFC]">{p.name}</div>
                    {p.isHost && (
                      <div className="flex items-center gap-1">
                        <StatusBadge variant="info">Host</StatusBadge>
                      </div>
                    )}
                  </div>
                </div>
                {currentPlayer?.isHost && !p.isHost && (
                  <button
                    onClick={() => kickPlayer(p.id)}
                    className="text-[#EF4444] hover:text-[#EF4444]/80 transition text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </PremiumCard>

        {/* Save Group (Host Only) */}
        {currentPlayer?.isHost && players.length >= 2 && (
          <PremiumCard className="p-4 mb-6">
            <label className="block text-sm text-[#CBD5E1] mb-2 font-medium uppercase tracking-wide">
              Save This Group
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="flex-1 bg-[#12161F] border border-white/10 text-[#F8FAFC] placeholder:text-[#64748B] px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all duration-200"
              />
              <button
                onClick={saveGroup}
                disabled={!newGroupName.trim()}
                className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0E14] font-semibold px-4 py-2.5 rounded-xl transition-all duration-200"
              >
                Save
              </button>
            </div>
          </PremiumCard>
        )}

        <DangerButton onClick={handleLeaveGame}>
          Leave Game
        </DangerButton>
      </div>
    </div>
  );
};

export default GameLobbyScreen;
