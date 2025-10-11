import React, { useState } from 'react';
import { TrendingUp, Trophy, Award, Flame, Target, Crown, Upload } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ProfilePage = ({ user, gameHistory, onUpdateProfile, onBack }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [uploading, setUploading] = useState(false);

  // Calculate stats
  const myGames = gameHistory.filter(g => g.myResult !== null);
  const totalGames = myGames.length;
  const wins = myGames.filter(g => parseFloat(g.myResult) > 0);
  const losses = myGames.filter(g => parseFloat(g.myResult) < 0);
  const totalProfit = myGames.reduce((sum, g) => sum + parseFloat(g.myResult), 0);
  const winRate = totalGames > 0 ? ((wins.length / totalGames) * 100).toFixed(0) : 0;
  const biggestWin = wins.length > 0 ? Math.max(...wins.map(g => parseFloat(g.myResult))) : 0;
  const biggestLoss = losses.length > 0 ? Math.min(...losses.map(g => parseFloat(g.myResult))) : 0;
  
  // Average buy-in
  const totalBuyIns = myGames.reduce((sum, g) => {
    return sum + g.players.reduce((s, p) => s + parseFloat(p.buyIn), 0);
  }, 0);
  const avgBuyIn = totalGames > 0 ? (totalBuyIns / totalGames).toFixed(2) : 0;

  // Favorite players (most played with)
  const playerFrequency = {};
  myGames.forEach(game => {
    game.players.forEach(p => {
      if (p.name !== user.displayName && p.name !== user.email) {
        playerFrequency[p.name] = (playerFrequency[p.name] || 0) + 1;
      }
    });
  });
  const favoritePlayers = Object.entries(playerFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Monthly performance chart data
  const monthlyData = {};
  myGames.forEach(game => {
    const month = new Date(game.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!monthlyData[month]) {
      monthlyData[month] = 0;
    }
    monthlyData[month] += parseFloat(game.myResult);
  });
  const chartData = Object.entries(monthlyData)
    .map(([month, profit]) => ({ month, profit: parseFloat(profit.toFixed(2)) }))
    .slice(-6); // Last 6 months

  // Achievements
  const achievements = [
    { 
      id: 'first_win', 
      icon: Trophy, 
      name: 'First Win', 
      desc: 'Win your first game',
      unlocked: wins.length > 0,
      color: 'text-yellow-400'
    },
    { 
      id: 'streak_5', 
      icon: Flame, 
      name: '5 Game Win Streak', 
      desc: 'Win 5 games in a row',
      unlocked: checkWinStreak(myGames, 5),
      color: 'text-orange-400'
    },
    { 
      id: 'big_night', 
      icon: Award, 
      name: '$100+ Single Night', 
      desc: 'Win $100+ in one session',
      unlocked: biggestWin >= 100,
      color: 'text-emerald-400'
    },
    { 
      id: 'games_10', 
      icon: Target, 
      name: '10 Games Played', 
      desc: 'Play 10 games total',
      unlocked: totalGames >= 10,
      color: 'text-blue-400'
    },
    { 
      id: 'games_50', 
      icon: Crown, 
      name: '50 Games Played', 
      desc: 'Play 50 games total',
      unlocked: totalGames >= 50,
      color: 'text-purple-400'
    },
    { 
      id: 'best_month', 
      icon: TrendingUp, 
      name: 'Most Profitable Month', 
      desc: 'Have your best month ever',
      unlocked: chartData.length > 0 && Math.max(...chartData.map(d => d.profit)) > 0,
      color: 'text-green-400'
    }
  ];

  function checkWinStreak(games, targetStreak) {
    let currentStreak = 0;
    let maxStreak = 0;
    const sortedGames = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedGames.forEach(game => {
      if (parseFloat(game.myResult) > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    return maxStreak >= targetStreak;
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // For now, just show alert - you'd implement Firebase Storage upload here
    alert('Photo upload coming soon! This will store your profile picture.');
    setUploading(false);
  };

  const handleSaveName = () => {
    if (displayName.trim()) {
      onUpdateProfile({ displayName: displayName.trim() });
      setIsEditingName(false);
    }
  };

  const memberSince = user.metadata?.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  const favoriteGroup = gameHistory.find(g => g.sessionName)?.sessionName || 'None yet';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-amber-400">Your Profile</h2>
          <button onClick={onBack} className="bg-black/40 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-lg">
            Back
          </button>
        </div>

        {/* User Info Section */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 mb-6 border-2 border-amber-500/30">
          <div className="flex items-start gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center font-bold text-4xl border-4 border-amber-500/50">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span>{(displayName || user.email)[0].toUpperCase()}</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-amber-500 rounded-full p-2 cursor-pointer hover:bg-amber-600 transition">
                <Upload size={16} />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            {/* User Details */}
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 bg-green-900/50 text-white px-3 py-2 rounded-lg border border-amber-500/20"
                  />
                  <button onClick={handleSaveName} className="bg-emerald-600 px-4 py-2 rounded-lg font-semibold">Save</button>
                  <button onClick={() => setIsEditingName(false)} className="bg-gray-600 px-4 py-2 rounded-lg">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-white">{displayName || 'Player'}</h3>
                  <button onClick={() => setIsEditingName(true)} className="text-amber-400 text-sm underline">Edit</button>
                </div>
              )}
              <p className="text-amber-300 mb-1">{user.email}</p>
              <p className="text-amber-200/60 text-sm">Member since {memberSince}</p>
              <p className="text-amber-200/60 text-sm mt-2">Favorite Group: <span className="text-amber-400">{favoriteGroup}</span></p>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-1">Total Games</div>
            <div className="text-3xl font-bold text-white">{totalGames}</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-1">Win/Loss Record</div>
            <div className="text-3xl font-bold text-white">{wins.length}W - {losses.length}L</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-1">Win Rate</div>
            <div className="text-3xl font-bold text-emerald-400">{winRate}%</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-1">Total Profit/Loss</div>
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-1">Biggest Win</div>
            <div className="text-3xl font-bold text-emerald-400">+${biggestWin.toFixed(2)}</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-1">Biggest Loss</div>
            <div className="text-3xl font-bold text-red-400">${biggestLoss.toFixed(2)}</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-2">Average Buy-In</div>
            <div className="text-2xl font-bold text-white">${avgBuyIn}</div>
          </div>
          <div className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-2">Favorite Players</div>
            {favoritePlayers.length > 0 ? (
              <div className="space-y-1">
                {favoritePlayers.map(([name, count]) => (
                  <div key={name} className="text-white text-sm">{name} ({count} games)</div>
                ))}
              </div>
            ) : (
              <div className="text-white/50 text-sm">Play more games to see stats</div>
            )}
          </div>
        </div>

        {/* Monthly Performance Chart */}
        {chartData.length > 0 && (
          <div className="bg-black/40 rounded-xl p-6 mb-6 border-2 border-amber-500/30">
            <h3 className="text-xl font-bold text-amber-400 mb-4">Monthly Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#fbbf24" />
                <YAxis stroke="#fbbf24" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #fbbf24' }}
                  labelStyle={{ color: '#fbbf24' }}
                />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Achievements */}
        <div className="bg-black/40 rounded-xl p-6 border-2 border-amber-500/30">
          <h3 className="text-xl font-bold text-amber-400 mb-4">Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map(achievement => {
              const Icon = achievement.icon;
              return (
                <div 
                  key={achievement.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    achievement.unlocked 
                      ? 'bg-green-900/30 border-emerald-500/50' 
                      : 'bg-gray-900/30 border-gray-600/30 opacity-50'
                  }`}
                >
                  <Icon className={`${achievement.unlocked ? achievement.color : 'text-gray-500'}`} size={32} />
                  <div>
                    <div className="font-semibold text-white">{achievement.name}</div>
                    <div className="text-xs text-amber-200/70">{achievement.desc}</div>
                  </div>
                  {achievement.unlocked && (
                    <div className="ml-auto text-emerald-400">✓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;