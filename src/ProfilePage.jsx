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
    <div className="min-h-screen bg-gradient-to-br from-poker-green-dark via-poker-green to-poker-green-light text-poker-cream p-6">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold font-serif text-poker-gold">Your Profile</h2>
          <button onClick={onBack} className="bg-poker-green-light/50 backdrop-blur-sm text-poker-gold border-2 border-poker-gold/30 hover:border-poker-gold/50 px-6 py-2 rounded-card-lg transition font-semibold shadow-lg">
            Back
          </button>
        </div>

        {/* User Info Section */}
        <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-2xl">
          <div className="flex items-start gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-poker-burgundy to-poker-burgundy-dark rounded-full flex items-center justify-center font-bold text-4xl border-4 border-poker-gold/50 shadow-xl">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-poker-gold">{(displayName || user.email)[0].toUpperCase()}</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-poker-gold hover:bg-poker-gold-light rounded-full p-2 cursor-pointer transition shadow-lg">
                <Upload size={16} className="text-poker-green" />
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
                    className="flex-1 bg-poker-green text-poker-cream px-4 py-2 rounded-card border border-poker-gold/30 focus:outline-none focus:ring-2 focus:ring-poker-gold"
                  />
                  <button onClick={handleSaveName} className="bg-gradient-to-r from-poker-burgundy to-poker-burgundy-dark hover:from-poker-burgundy-dark hover:to-poker-burgundy text-poker-cream px-6 py-2 rounded-card-lg font-semibold border-2 border-poker-gold/50 transition shadow-lg">Save</button>
                  <button onClick={() => setIsEditingName(false)} className="bg-poker-green-light/50 text-poker-grey hover:text-poker-cream px-4 py-2 rounded-card-lg border border-poker-gold/20 transition">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold font-serif text-poker-cream">{displayName || 'Player'}</h3>
                  <button onClick={() => setIsEditingName(true)} className="text-poker-gold hover:text-poker-gold-light text-sm underline transition">Edit</button>
                </div>
              )}
              <p className="text-poker-gold mb-1">{user.email}</p>
              <p className="text-poker-grey text-sm">Member since {memberSince}</p>
              <p className="text-poker-grey text-sm mt-2">Favorite Group: <span className="text-poker-gold">{favoriteGroup}</span></p>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 border-2 border-poker-gold/30 shadow-xl">
            <div className="text-sm text-poker-gold mb-1 font-semibold">Total Games</div>
            <div className="text-3xl font-bold text-poker-cream">{totalGames}</div>
          </div>
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 border-2 border-poker-gold/30 shadow-xl">
            <div className="text-sm text-poker-gold mb-1 font-semibold">Win/Loss Record</div>
            <div className="text-3xl font-bold text-poker-cream">{wins.length}W - {losses.length}L</div>
          </div>
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 border-2 border-poker-gold/30 shadow-xl">
            <div className="text-sm text-poker-gold mb-1 font-semibold">Win Rate</div>
            <div className="text-3xl font-bold text-poker-gold-light">{winRate}%</div>
          </div>
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 border-2 border-poker-gold/30 shadow-xl">
            <div className="text-sm text-poker-gold mb-1 font-semibold">Total Profit/Loss</div>
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-poker-gold-light' : 'text-poker-burgundy-light'}`}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 border-2 border-poker-gold/30 shadow-xl">
            <div className="text-sm text-poker-gold mb-1 font-semibold">Biggest Win</div>
            <div className="text-3xl font-bold text-poker-gold-light">+${biggestWin.toFixed(2)}</div>
          </div>
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 border-2 border-poker-gold/30 shadow-xl">
            <div className="text-sm text-poker-gold mb-1 font-semibold">Biggest Loss</div>
            <div className="text-3xl font-bold text-poker-burgundy-light">${biggestLoss.toFixed(2)}</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 border-2 border-poker-gold/30 shadow-xl">
            <div className="text-sm text-poker-gold mb-2 font-semibold">Average Buy-In</div>
            <div className="text-2xl font-bold text-poker-cream">${avgBuyIn}</div>
          </div>
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 border-2 border-poker-gold/30 shadow-xl">
            <div className="text-sm text-poker-gold mb-2 font-semibold">Favorite Players</div>
            {favoritePlayers.length > 0 ? (
              <div className="space-y-1">
                {favoritePlayers.map(([name, count]) => (
                  <div key={name} className="text-poker-cream text-sm font-medium">{name} <span className="text-poker-grey">({count} games)</span></div>
                ))}
              </div>
            ) : (
              <div className="text-poker-grey text-sm">Play more games to see stats</div>
            )}
          </div>
        </div>

        {/* Monthly Performance Chart */}
        {chartData.length > 0 && (
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-poker-gold mb-4">Monthly Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#114C38" />
                <XAxis dataKey="month" stroke="#FFD700" />
                <YAxis stroke="#FFD700" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B3D2E', border: '2px solid #FFD700', borderRadius: '12px' }}
                  labelStyle={{ color: '#FFD700', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="profit" stroke="#FFE44D" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Achievements */}
        <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 border-2 border-poker-gold/30 shadow-xl">
          <h3 className="text-xl font-bold font-serif text-poker-gold mb-4">Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map(achievement => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-3 p-4 rounded-card border-2 transition ${
                    achievement.unlocked
                      ? 'bg-poker-green border-poker-gold/50 shadow-lg'
                      : 'bg-poker-green-dark/50 border-poker-grey/20 opacity-50'
                  }`}
                >
                  <Icon className={`${achievement.unlocked ? achievement.color : 'text-poker-grey/50'}`} size={32} />
                  <div>
                    <div className="font-semibold text-poker-cream">{achievement.name}</div>
                    <div className="text-xs text-poker-grey">{achievement.desc}</div>
                  </div>
                  {achievement.unlocked && (
                    <div className="ml-auto text-poker-gold-light font-bold text-xl">✓</div>
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