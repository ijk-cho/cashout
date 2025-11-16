import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, Target, Award, Medal } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { PremiumCard } from '../components/PremiumUI';

const LeaderboardsScreen = () => {
  const navigate = useNavigate();
  const { gameHistory, friends } = useGame();
  const [leaderboardType, setLeaderboardType] = useState('profit'); // 'profit', 'winRate', 'games'

  const handleBack = () => {
    navigate('/');
  };

  // Calculate player statistics from game history
  const playerStats = {};

  gameHistory.forEach(game => {
    if (game.players && Array.isArray(game.players)) {
      game.players.forEach(player => {
        if (!playerStats[player.name]) {
          playerStats[player.name] = {
            name: player.name,
            totalProfit: 0,
            wins: 0,
            losses: 0,
            games: 0,
          };
        }

        const result = parseFloat(game.myResult || 0);
        playerStats[player.name].games += 1;
        playerStats[player.name].totalProfit += result;

        if (result > 0) {
          playerStats[player.name].wins += 1;
        } else if (result < 0) {
          playerStats[player.name].losses += 1;
        }
      });
    }
  });

  // Calculate win rates
  const leaderboardData = Object.values(playerStats).map(player => ({
    ...player,
    winRate: player.games > 0 ? ((player.wins / player.games) * 100).toFixed(0) : 0,
  }));

  // Sort based on selected type
  let sortedLeaderboard = [...leaderboardData];
  if (leaderboardType === 'profit') {
    sortedLeaderboard.sort((a, b) => b.totalProfit - a.totalProfit);
  } else if (leaderboardType === 'winRate') {
    sortedLeaderboard.sort((a, b) => b.winRate - a.winRate);
  } else if (leaderboardType === 'games') {
    sortedLeaderboard.sort((a, b) => b.games - a.games);
  }

  const getMedalIcon = (index) => {
    if (index === 0) return <Trophy className="text-[#FFD700]" size={24} />;
    if (index === 1) return <Medal className="text-[#C0C0C0]" size={24} />;
    if (index === 2) return <Medal className="text-[#CD7F32]" size={24} />;
    return null;
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

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-xl flex items-center justify-center">
            <Trophy className="text-[#0A0E14]" size={24} />
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">Leaderboards</h2>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setLeaderboardType('profit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              leaderboardType === 'profit'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            <TrendingUp size={16} />
            Profit
          </button>
          <button
            onClick={() => setLeaderboardType('winRate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              leaderboardType === 'winRate'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            <Target size={16} />
            Win Rate
          </button>
          <button
            onClick={() => setLeaderboardType('games')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              leaderboardType === 'games'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            <Award size={16} />
            Games Played
          </button>
        </div>

        {/* Leaderboard */}
        {sortedLeaderboard.length === 0 ? (
          <PremiumCard className="p-12 text-center">
            <Trophy className="mx-auto mb-4 text-[#64748B]" size={48} />
            <p className="text-[#64748B] text-lg mb-2">No leaderboard data yet</p>
            <p className="text-[#64748B] text-sm">Play games to see player rankings!</p>
          </PremiumCard>
        ) : (
          <div className="space-y-3">
            {sortedLeaderboard.map((player, index) => (
              <PremiumCard
                key={player.name}
                className={`p-5 transition-all duration-200 ${
                  index < 3 ? 'border-[#D4AF37]/50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-12 h-12 flex items-center justify-center">
                    {index < 3 ? (
                      getMedalIcon(index)
                    ) : (
                      <span className="text-xl font-bold text-[#64748B]">#{index + 1}</span>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#F8FAFC]">{player.name}</h3>
                    <div className="flex gap-4 text-sm text-[#64748B] mt-1">
                      <span>{player.games} games</span>
                      <span>{player.wins}W - {player.losses}L</span>
                    </div>
                  </div>

                  {/* Stats Based on Type */}
                  <div className="text-right">
                    {leaderboardType === 'profit' && (
                      <div className={`text-2xl font-bold ${
                        player.totalProfit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                      }`}>
                        {player.totalProfit >= 0 ? '+' : ''}${player.totalProfit.toFixed(2)}
                      </div>
                    )}
                    {leaderboardType === 'winRate' && (
                      <div className="text-2xl font-bold text-[#D4AF37]">
                        {player.winRate}%
                      </div>
                    )}
                    {leaderboardType === 'games' && (
                      <div className="text-2xl font-bold text-[#F8FAFC]">
                        {player.games}
                      </div>
                    )}
                    <div className="text-xs text-[#64748B] mt-1">
                      {leaderboardType === 'profit' && 'Total Profit'}
                      {leaderboardType === 'winRate' && 'Win Rate'}
                      {leaderboardType === 'games' && 'Games Played'}
                    </div>
                  </div>
                </div>
              </PremiumCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardsScreen;
