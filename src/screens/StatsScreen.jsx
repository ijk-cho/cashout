import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, DollarSign, Target, Award, BarChart3, PieChart } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { PremiumCard } from '../components/PremiumUI';

const StatsScreen = () => {
  const navigate = useNavigate();
  const { gameHistory, calculateStats } = useGame();

  const handleBack = () => {
    navigate('/');
  };

  const stats = useMemo(() => calculateStats(), [calculateStats, gameHistory]);

  // Calculate additional detailed stats with memoization
  const myGames = useMemo(() =>
    gameHistory.filter(g => g.myResult !== null),
    [gameHistory]
  );

  const wins = useMemo(() =>
    myGames.filter(g => parseFloat(g.myResult) > 0),
    [myGames]
  );

  const losses = useMemo(() =>
    myGames.filter(g => parseFloat(g.myResult) < 0),
    [myGames]
  );

  const breakEven = useMemo(() =>
    myGames.filter(g => parseFloat(g.myResult) === 0),
    [myGames]
  );

  const biggestWin = useMemo(() =>
    wins.length > 0 ? Math.max(...wins.map(g => parseFloat(g.myResult))) : 0,
    [wins]
  );

  const biggestLoss = useMemo(() =>
    losses.length > 0 ? Math.min(...losses.map(g => parseFloat(g.myResult))) : 0,
    [losses]
  );

  const averageWin = useMemo(() =>
    wins.length > 0 ? (wins.reduce((sum, g) => sum + parseFloat(g.myResult), 0) / wins.length) : 0,
    [wins]
  );

  const averageLoss = useMemo(() =>
    losses.length > 0 ? (losses.reduce((sum, g) => sum + parseFloat(g.myResult), 0) / losses.length) : 0,
    [losses]
  );

  // Calculate average players per game with memoization
  const avgPlayers = useMemo(() => {
    const totalPlayers = myGames.reduce((sum, g) => sum + (g.players?.length || 0), 0);
    return myGames.length > 0 ? (totalPlayers / myGames.length).toFixed(1) : 0;
  }, [myGames]);

  // Calculate monthly performance with memoization
  const { monthlyStats, bestMonth, worstMonth } = useMemo(() => {
    const stats = {};
    myGames.forEach(game => {
      const month = new Date(game.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!stats[month]) {
        stats[month] = { total: 0, games: 0 };
      }
      stats[month].total += parseFloat(game.myResult);
      stats[month].games += 1;
    });

    const best = Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total)[0];

    const worst = Object.entries(stats)
      .sort((a, b) => a[1].total - b[1].total)[0];

    return { monthlyStats: stats, bestMonth: best, worstMonth: worst };
  }, [myGames]);

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
            <BarChart3 className="text-[#0A0E14]" size={24} />
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">Statistics</h2>
        </div>

        {myGames.length === 0 ? (
          <PremiumCard className="p-12 text-center">
            <PieChart className="mx-auto mb-4 text-[#64748B]" size={48} />
            <p className="text-[#64748B] text-lg mb-2">No statistics available yet</p>
            <p className="text-[#64748B] text-sm">Play some games to see your stats!</p>
          </PremiumCard>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div>
              <h3 className="text-sm font-semibold text-[#D4AF37] mb-3 uppercase tracking-wide">Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <PremiumCard className="p-4 text-center">
                  <div className="text-2xl font-bold text-[#F8FAFC] mb-1">{stats.totalGames}</div>
                  <div className="text-xs text-[#64748B] uppercase tracking-wider">Total Games</div>
                </PremiumCard>

                <PremiumCard className="p-4 text-center">
                  <div className={`text-2xl font-bold mb-1 ${
                    parseFloat(stats.totalResult) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                  }`}>
                    {parseFloat(stats.totalResult) >= 0 ? '+' : ''}${stats.totalResult}
                  </div>
                  <div className="text-xs text-[#64748B] uppercase tracking-wider">Net Profit</div>
                </PremiumCard>

                <PremiumCard className="p-4 text-center">
                  <div className="text-2xl font-bold text-[#D4AF37] mb-1">{stats.winRate}%</div>
                  <div className="text-xs text-[#64748B] uppercase tracking-wider">Win Rate</div>
                </PremiumCard>

                <PremiumCard className="p-4 text-center">
                  <div className="text-2xl font-bold text-[#F8FAFC] mb-1">{avgPlayers}</div>
                  <div className="text-xs text-[#64748B] uppercase tracking-wider">Avg Players</div>
                </PremiumCard>
              </div>
            </div>

            {/* Win/Loss Breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-[#D4AF37] mb-3 uppercase tracking-wide">Win/Loss Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <PremiumCard className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#CBD5E1]">Wins</span>
                    <TrendingUp className="text-[#10B981]" size={18} />
                  </div>
                  <div className="text-2xl font-bold text-[#10B981] mb-1">{wins.length}</div>
                  <div className="text-xs text-[#64748B]">
                    Avg: +${averageWin.toFixed(2)}
                  </div>
                </PremiumCard>

                <PremiumCard className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#CBD5E1]">Losses</span>
                    <TrendingUp className="text-[#EF4444] rotate-180" size={18} />
                  </div>
                  <div className="text-2xl font-bold text-[#EF4444] mb-1">{losses.length}</div>
                  <div className="text-xs text-[#64748B]">
                    Avg: ${averageLoss.toFixed(2)}
                  </div>
                </PremiumCard>

                <PremiumCard className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#CBD5E1]">Break Even</span>
                    <Target className="text-[#64748B]" size={18} />
                  </div>
                  <div className="text-2xl font-bold text-[#64748B] mb-1">{breakEven.length}</div>
                  <div className="text-xs text-[#64748B]">
                    No gain/loss
                  </div>
                </PremiumCard>
              </div>
            </div>

            {/* Best & Worst */}
            <div>
              <h3 className="text-sm font-semibold text-[#D4AF37] mb-3 uppercase tracking-wide">Records</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PremiumCard className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#10B981]/20 rounded-lg flex items-center justify-center">
                      <Award className="text-[#10B981]" size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-[#CBD5E1] uppercase tracking-wider">Biggest Win</div>
                      <div className="text-2xl font-bold text-[#10B981]">+${biggestWin.toFixed(2)}</div>
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#EF4444]/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-[#EF4444] rotate-180" size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-[#CBD5E1] uppercase tracking-wider">Biggest Loss</div>
                      <div className="text-2xl font-bold text-[#EF4444]">${biggestLoss.toFixed(2)}</div>
                    </div>
                  </div>
                </PremiumCard>
              </div>
            </div>

            {/* Monthly Performance */}
            {Object.keys(monthlyStats).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#D4AF37] mb-3 uppercase tracking-wide">Monthly Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bestMonth && (
                    <PremiumCard className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                          <TrendingUp className="text-[#D4AF37]" size={20} />
                        </div>
                        <div>
                          <div className="text-xs text-[#CBD5E1] uppercase tracking-wider">Best Month</div>
                          <div className="text-lg font-bold text-[#F8FAFC]">{bestMonth[0]}</div>
                          <div className="text-sm text-[#10B981]">
                            +${bestMonth[1].total.toFixed(2)} ({bestMonth[1].games} games)
                          </div>
                        </div>
                      </div>
                    </PremiumCard>
                  )}

                  {worstMonth && worstMonth[1].total < 0 && (
                    <PremiumCard className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#64748B]/20 rounded-lg flex items-center justify-center">
                          <TrendingUp className="text-[#64748B] rotate-180" size={20} />
                        </div>
                        <div>
                          <div className="text-xs text-[#CBD5E1] uppercase tracking-wider">Worst Month</div>
                          <div className="text-lg font-bold text-[#F8FAFC]">{worstMonth[0]}</div>
                          <div className="text-sm text-[#EF4444]">
                            ${worstMonth[1].total.toFixed(2)} ({worstMonth[1].games} games)
                          </div>
                        </div>
                      </div>
                    </PremiumCard>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsScreen;
