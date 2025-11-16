import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, TrendingUp, TrendingDown, Calendar, Users, Trash2 } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import {
  GhostButton,
  PremiumCard,
} from '../components/PremiumUI';

const HistoryScreen = () => {
  const navigate = useNavigate();
  const { gameHistory, setGameHistory } = useGame();
  const [filter, setFilter] = useState('all'); // 'all', 'wins', 'losses'

  const handleBack = () => {
    navigate('/');
  };

  const handleDeleteGame = (gameId) => {
    if (window.confirm('Delete this game from history?')) {
      const updatedHistory = gameHistory.filter(g => g.id !== gameId);
      setGameHistory(updatedHistory);
      localStorage.setItem('pokerGameHistory', JSON.stringify(updatedHistory));
    }
  };

  const filteredGames = gameHistory.filter(game => {
    if (filter === 'wins') return parseFloat(game.myResult) > 0;
    if (filter === 'losses') return parseFloat(game.myResult) < 0;
    return true;
  });

  const sortedGames = [...filteredGames].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-[#0A0E14] p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <button
          onClick={handleBack}
          className="text-[#CBD5E1] hover:text-[#F8FAFC] mb-6 flex items-center gap-2 hover:bg-white/5 p-2 rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-xl flex items-center justify-center">
              <History className="text-[#0A0E14]" size={24} />
            </div>
            <h2 className="text-3xl font-bold text-[#F8FAFC]">Game History</h2>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              filter === 'all'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            All Games
          </button>
          <button
            onClick={() => setFilter('wins')}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              filter === 'wins'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            Wins
          </button>
          <button
            onClick={() => setFilter('losses')}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              filter === 'losses'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            Losses
          </button>
        </div>

        {/* Game History List */}
        {sortedGames.length === 0 ? (
          <PremiumCard className="p-12 text-center">
            <History className="mx-auto mb-4 text-[#64748B]" size={48} />
            <p className="text-[#64748B] text-lg">
              {filter === 'all' ? 'No games played yet' : `No ${filter} to display`}
            </p>
            <GhostButton onClick={() => navigate('/host')} className="mt-4">
              Start a Game
            </GhostButton>
          </PremiumCard>
        ) : (
          <div className="space-y-3">
            {sortedGames.map((game) => {
              const result = parseFloat(game.myResult);
              const isWin = result > 0;
              const isLoss = result < 0;

              return (
                <PremiumCard key={game.id} className="p-5 hover:border-[#D4AF37]/30 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Game Name and Date */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-[#F8FAFC]">
                          {game.sessionName || 'Poker Game'}
                        </h3>
                        {isWin && <TrendingUp className="text-[#10B981]" size={20} />}
                        {isLoss && <TrendingDown className="text-[#EF4444]" size={20} />}
                      </div>

                      {/* Date and Players */}
                      <div className="flex flex-wrap gap-4 text-sm text-[#64748B] mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(game.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={14} />
                          <span>{game.players?.length || 0} players</span>
                        </div>
                      </div>

                      {/* Result */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#CBD5E1]">Your Result:</span>
                        <span className={`text-xl font-bold ${
                          isWin ? 'text-[#10B981]' : isLoss ? 'text-[#EF4444]' : 'text-[#64748B]'
                        }`}>
                          {result > 0 ? '+' : ''}${result.toFixed(2)}
                        </span>
                      </div>

                      {/* Notes */}
                      {game.notes && (
                        <p className="mt-2 text-sm text-[#64748B] italic">{game.notes}</p>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="text-[#64748B] hover:text-[#EF4444] p-2 rounded-lg hover:bg-[#EF4444]/10 transition-all duration-200"
                      title="Delete game"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </PremiumCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryScreen;
