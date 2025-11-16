import React, { useState } from 'react';
import { TrendingUp, Trophy, Award, Flame, Target, Crown, Upload } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { auth } from './firebase';

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      // Create a reference to store the image
      const imageRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}_${file.name}`);

      // Upload the file
      await uploadBytes(imageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(imageRef);

      // Update the user's profile with the new photo URL
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });

      // Trigger the parent component's update handler
      onUpdateProfile({ photoURL: downloadURL });

      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
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
    <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 premium-pattern"></div>

      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold font-serif text-[#D4AF37]">Your Profile</h2>
          <button onClick={onBack} className="bg-[#1E2433] hover:bg-[#252B3D] text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-6 py-2 rounded-xl transition-all duration-200 font-semibold shadow-lg">
            Back
          </button>
        </div>

        {/* User Info Section */}
        <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-2xl">
          <div className="flex items-start gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-full flex items-center justify-center font-bold text-4xl shadow-[0_8px_32px_rgba(212,175,55,0.3)]">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-[#0A0E14]">{(displayName || user.email)[0].toUpperCase()}</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] rounded-full p-2 cursor-pointer transition-all duration-200 shadow-lg">
                <Upload size={16} className="text-[#0A0E14]" />
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
                    className="flex-1 bg-[#12161F] text-[#F8FAFC] px-4 py-2 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all duration-200"
                  />
                  <button onClick={handleSaveName} className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] text-[#0A0E14] px-6 py-2 rounded-xl font-semibold transition-all duration-200 shadow-lg">Save</button>
                  <button onClick={() => setIsEditingName(false)} className="bg-[#1E2433] text-[#CBD5E1] hover:text-[#F8FAFC] px-4 py-2 rounded-xl border border-white/10 transition-all duration-200">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold font-serif text-[#F8FAFC]">{displayName || 'Player'}</h3>
                  <button onClick={() => setIsEditingName(true)} className="text-[#D4AF37] hover:text-[#C9A942] text-sm underline transition-colors duration-200">Edit</button>
                </div>
              )}
              <p className="text-[#D4AF37] mb-1">{user.email}</p>
              <p className="text-[#CBD5E1] text-sm">Member since {memberSince}</p>
              <p className="text-[#CBD5E1] text-sm mt-2">Favorite Group: <span className="text-[#D4AF37]">{favoriteGroup}</span></p>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="text-sm text-[#D4AF37] mb-1 font-semibold">Total Games</div>
            <div className="text-3xl font-bold text-[#F8FAFC]">{totalGames}</div>
          </div>
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="text-sm text-[#D4AF37] mb-1 font-semibold">Win/Loss Record</div>
            <div className="text-3xl font-bold text-[#F8FAFC]">{wins.length}W - {losses.length}L</div>
          </div>
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="text-sm text-[#D4AF37] mb-1 font-semibold">Win Rate</div>
            <div className="text-3xl font-bold text-[#D4AF37]">{winRate}%</div>
          </div>
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="text-sm text-[#D4AF37] mb-1 font-semibold">Total Profit/Loss</div>
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="text-sm text-[#D4AF37] mb-1 font-semibold">Biggest Win</div>
            <div className="text-3xl font-bold text-[#10B981]">+${biggestWin.toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="text-sm text-[#D4AF37] mb-1 font-semibold">Biggest Loss</div>
            <div className="text-3xl font-bold text-[#EF4444]">${biggestLoss.toFixed(2)}</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="text-sm text-[#D4AF37] mb-2 font-semibold">Average Buy-In</div>
            <div className="text-2xl font-bold text-[#F8FAFC]">${avgBuyIn}</div>
          </div>
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="text-sm text-[#D4AF37] mb-2 font-semibold">Favorite Players</div>
            {favoritePlayers.length > 0 ? (
              <div className="space-y-1">
                {favoritePlayers.map(([name, count]) => (
                  <div key={name} className="text-[#F8FAFC] text-sm font-medium">{name} <span className="text-[#CBD5E1]">({count} games)</span></div>
                ))}
              </div>
            ) : (
              <div className="text-[#64748B] text-sm">Play more games to see stats</div>
            )}
          </div>
        </div>

        {/* Monthly Performance Chart */}
        {chartData.length > 0 && (
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
            <h3 className="text-xl font-bold font-serif text-[#D4AF37] mb-4">Monthly Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="month" stroke="#D4AF37" />
                <YAxis stroke="#D4AF37" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E2433', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px' }}
                  labelStyle={{ color: '#D4AF37', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="profit" stroke="#D4AF37" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Achievements */}
        <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 border border-white/10 shadow-xl">
          <h3 className="text-xl font-bold font-serif text-[#D4AF37] mb-4">Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map(achievement => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
                    achievement.unlocked
                      ? 'bg-[#12161F] border-[#D4AF37]/50 shadow-lg'
                      : 'bg-[#0A0E14]/50 border-white/5 opacity-50'
                  }`}
                >
                  <Icon className={`${achievement.unlocked ? achievement.color : 'text-[#64748B]'}`} size={32} />
                  <div>
                    <div className="font-semibold text-[#F8FAFC]">{achievement.name}</div>
                    <div className="text-xs text-[#CBD5E1]">{achievement.desc}</div>
                  </div>
                  {achievement.unlocked && (
                    <div className="ml-auto text-[#D4AF37] font-bold text-xl">✓</div>
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