import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './Auth';
import ProfilePage from './ProfilePage';
import { DollarSign, Users, Plus, Share2, Copy, Check, TrendingUp, History, ArrowRight } from 'lucide-react';
import { createGame, getGameByCode, updateGame, subscribeToGame, removePlayer, updatePaymentStatus } from './gameService';

const dollarsToCents = (dollarString) => {
  const cleaned = dollarString.replace(/[$\s,]/g, '');
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars) || dollars < 0) return 0;
  return Math.round(dollars * 100);
};

const centsToDollars = (cents) => {
  return (cents / 100).toFixed(2);
};

const optimizeSettlement = (players) => {
  const creditors = players
    .filter(p => p.netResultCents > 0)
    .map(p => ({ ...p, remainingCents: p.netResultCents }))
    .sort((a, b) => b.remainingCents - a.remainingCents);
  
  const debtors = players
    .filter(p => p.netResultCents < 0)
    .map(p => ({ ...p, remainingCents: -p.netResultCents }))
    .sort((a, b) => b.remainingCents - a.remainingCents);
  
  const transactions = [];
  let i = 0, j = 0;
  
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amountCents = Math.min(creditor.remainingCents, debtor.remainingCents);
    
    transactions.push({
      from: debtor.name,
      to: creditor.name,
      amountCents,
      toVenmo: creditor.venmoUsername
    });
    
    creditor.remainingCents -= amountCents;
    debtor.remainingCents -= amountCents;
    
    if (creditor.remainingCents === 0) i++;
    if (debtor.remainingCents === 0) j++;
  }
  
  return transactions;
};

const PokerSettleApp = () => {
  const [screen, setScreen] = useState('home');
  const [gameCode, setGameCode] = useState('');
  const [gameId, setGameId] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [buyInInput, setBuyInInput] = useState('');
  const [settlements, setSettlements] = useState([]);
  const [gameNotes, setGameNotes] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [savedGroups, setSavedGroups] = useState([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [user, setUser] = useState(undefined); // undefined = loading, null = guest, object = signed in
  const [authChecked, setAuthChecked] = useState(false);
  // Settings state
  const [settingsTab, setSettingsTab] = useState('account');
  const [userSettings, setUserSettings] = useState({
    displayName: user?.displayName || 'Poker Player',
    email: user?.email || '',
    defaultBuyIn: 100,
    preferredPayment: 'venmo',
    currency: 'USD',
    quickBuyInAmounts: [20, 50, 100, 200, 500],
    soundEnabled: true

  });
  // Edit states
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingQuickAmounts, setEditingQuickAmounts] = useState(false);

  // Form fields
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [tempQuickAmounts, setTempQuickAmounts] = useState([]);
  const quickAmounts = [5, 10, 20, 50, 100];

  //PWA
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Analytics state
  const [analyticsView, setAnalyticsView] = useState('overview'); // 'overview', 'trends', 'players'

  const [selectedGroupId, setSelectedGroupId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('pokerGameHistory');
    if (saved) {
      setGameHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // Will be object if signed in, null if not
      setAuthChecked(true);
    });
    
    return () => unsubscribe();
  }, []);

  // NEW: Check for game code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlGameCode = params.get('code');
    
    if (urlGameCode && authChecked && user) {
      // Auto-populate the join game screen
      setInputCode(urlGameCode.toUpperCase());
      setScreen('join');
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [authChecked, user]);
  
  useEffect(() => {
    const saved = localStorage.getItem('pokerGameGroups');
    if (saved) {
      setSavedGroups(JSON.parse(saved));
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  useEffect(() => {
    if (screen !== 'home') {
      setShowProfileMenu(false);
    }
  }, [screen]);

  const saveToHistory = (game) => {
    if (user === 'guest' || !user) {
      // Guest mode - don't save
      return;
    }
    const newHistory = [game, ...gameHistory].slice(0, 50);
    setGameHistory(newHistory);
    localStorage.setItem('pokerGameHistory', JSON.stringify(newHistory));
  };

  const calculateStats = () => {
    const myGames = gameHistory.filter(g => g.myResult !== null);
    const totalGames = myGames.length;
    const totalResult = myGames.reduce((sum, g) => sum + parseFloat(g.myResult), 0);
    const wins = myGames.filter(g => parseFloat(g.myResult) > 0).length;
    const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(0) : 0;
    return { totalGames, totalResult: totalResult.toFixed(2), winRate };
  };

const saveGroup = () => {
  if (!newGroupName.trim() || players.length < 2) return;
  
  const group = {
    id: Date.now().toString(),
    name: newGroupName,
    players: players.map(p => ({ name: p.name, venmoUsername: p.venmoUsername }))
  };
  
  const updated = [...savedGroups, group];
  setSavedGroups(updated);
  localStorage.setItem('pokerGameGroups', JSON.stringify(updated));
  setNewGroupName('');
  alert('Group saved!');
};

const loadGroup = (group) => {
  const loadedPlayers = group.players.map((p, idx) => ({
    id: `${Date.now()}-${idx}`,
    name: p.name,
    venmoUsername: p.venmoUsername || '',
    isHost: idx === 0,
    buyInsCents: [],
    totalBuyInCents: 0,
    finalChipsCents: null,
    netResultCents: 0
  }));
  
  setPlayers(loadedPlayers);
  setCurrentPlayer(loadedPlayers[0]);
  setPlayerName(loadedPlayers[0].name);
  setSelectedGroupId(group.id); // Track which group is being used
  setShowGroupSelector(false);
};

const deleteGroup = (groupId) => {
  if (!window.confirm('Delete this group?')) return;
  const updated = savedGroups.filter(g => g.id !== groupId);
  setSavedGroups(updated);
  localStorage.setItem('pokerGameGroups', JSON.stringify(updated));
};

// Analytics functions
const getStreakData = () => {
  const myGames = gameHistory.filter(g => g.myResult !== null).reverse();
  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLoseStreak = 0;
  let tempWinStreak = 0;
  let tempLoseStreak = 0;

  myGames.forEach((game, idx) => {
    const result = parseFloat(game.myResult);
    
    if (result > 0) {
      tempWinStreak++;
      tempLoseStreak = 0;
      if (idx === myGames.length - 1) currentStreak = tempWinStreak;
      longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
    } else if (result < 0) {
      tempLoseStreak++;
      tempWinStreak = 0;
      if (idx === myGames.length - 1) currentStreak = -tempLoseStreak;
      longestLoseStreak = Math.max(longestLoseStreak, tempLoseStreak);
    }
  });

  return { currentStreak, longestWinStreak, longestLoseStreak };
};

const getProfitByMonth = () => {
  const monthlyData = {};
  
  gameHistory.filter(g => g.myResult !== null).forEach(game => {
    const date = new Date(game.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { month: monthKey, profit: 0, games: 0 };
    }
    
    monthlyData[monthKey].profit += parseFloat(game.myResult);
    monthlyData[monthKey].games += 1;
  });

  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
};

const getBestWorstDays = () => {
  const dayData = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  gameHistory.filter(g => g.myResult !== null).forEach(game => {
    const day = new Date(game.date).getDay();
    dayData[day].push(parseFloat(game.myResult));
  });

  const dayStats = Object.entries(dayData).map(([day, results]) => ({
    day: dayNames[day],
    avgProfit: results.length > 0 ? (results.reduce((a, b) => a + b, 0) / results.length) : 0,
    games: results.length
  })).filter(d => d.games > 0).sort((a, b) => b.avgProfit - a.avgProfit);

  return dayStats;
};

// Leaderboard functions
const getGroupLeaderboard = (groupId) => {
  const groupGames = gameHistory.filter(g => g.groupId === groupId);
  const playerStats = {};

  groupGames.forEach(game => {
    game.players.forEach(player => {
      if (!playerStats[player.name]) {
        playerStats[player.name] = {
          name: player.name,
          games: 0,
          wins: 0,
          totalProfit: 0,
          biggestWin: 0,
          biggestLoss: 0
        };
      }

      const result = player.netResultCents / 100;
      playerStats[player.name].games++;
      playerStats[player.name].totalProfit += result;
      
      if (result > 0) {
        playerStats[player.name].wins++;
        playerStats[player.name].biggestWin = Math.max(playerStats[player.name].biggestWin, result);
      } else if (result < 0) {
        playerStats[player.name].biggestLoss = Math.min(playerStats[player.name].biggestLoss, result);
      }
    });
  });

  return Object.values(playerStats)
    .map(p => ({
      ...p,
      winRate: p.games > 0 ? ((p.wins / p.games) * 100).toFixed(1) : 0,
      avgProfit: p.games > 0 ? (p.totalProfit / p.games).toFixed(2) : 0
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
};

const getOverallLeaderboard = () => {
  const playerStats = {};

  gameHistory.forEach(game => {
    game.players.forEach(player => {
      if (!playerStats[player.name]) {
        playerStats[player.name] = {
          name: player.name,
          games: 0,
          wins: 0,
          totalProfit: 0,
          biggestWin: 0
        };
      }

      const result = player.netResultCents / 100;
      playerStats[player.name].games++;
      playerStats[player.name].totalProfit += result;
      
      if (result > 0) {
        playerStats[player.name].wins++;
        playerStats[player.name].biggestWin = Math.max(playerStats[player.name].biggestWin, result);
      }
    });
  });

  return Object.values(playerStats)
    .map(p => ({
      ...p,
      winRate: p.games > 0 ? ((p.wins / p.games) * 100).toFixed(1) : 0,
      avgProfit: p.games > 0 ? (p.totalProfit / p.games).toFixed(2) : 0
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
};


// Settings functions
const saveDisplayName = () => {
  if (newDisplayName.trim()) {
    setUserSettings({...userSettings, displayName: newDisplayName.trim()});
    setEditingDisplayName(false);
    setNewDisplayName('');
    alert('Display name updated successfully!');
  }
};

const saveEmail = () => {
  if (newEmail.trim() && currentPassword) {
    setUserSettings({...userSettings, email: newEmail.trim()});
    setEditingEmail(false);
    setNewEmail('');
    setCurrentPassword('');
    alert('Email updated successfully!');
  } else {
    alert('Please enter new email and current password');
  }
};

const savePassword = () => {
  if (currentPassword && newPassword && confirmPassword) {
    if (newPassword === confirmPassword) {
      if (newPassword.length >= 6) {
        setEditingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        alert('Password updated successfully!');
      } else {
        alert('Password must be at least 6 characters');
      }
    } else {
      alert('New passwords do not match');
    }
  } else {
    alert('Please fill all password fields');
  }
};

const deleteAccount = () => {
  if (deleteConfirmText === 'DELETE') {
    alert('Account deleted. Logging out...');
    signOut(auth);
  } else {
    alert('Please type DELETE to confirm');
  }
};

const saveQuickAmounts = () => {
  setUserSettings({...userSettings, quickBuyInAmounts: tempQuickAmounts});
  setEditingQuickAmounts(false);
  alert('Quick buy-in amounts updated!');
};

const addQuickAmount = () => {
  setTempQuickAmounts([...tempQuickAmounts, 100]);
};

const removeQuickAmount = (index) => {
  setTempQuickAmounts(tempQuickAmounts.filter((_, i) => i !== index));
};

const updateQuickAmount = (index, value) => {
  const newAmounts = [...tempQuickAmounts];
  newAmounts[index] = parseInt(value) || 0;
  setTempQuickAmounts(newAmounts);
};

  const resetApp = () => {
    if (unsubscribe) {
      unsubscribe();
    }
    setScreen('home');
    setGameCode('');
    setGameId(null);
    setInputCode('');
    setPlayerName('');
    setVenmoUsername('');
    setPlayers([]);
    setCurrentPlayer(null);
    setBuyInInput('');
    setSettlements([]);
    setUnsubscribe(null);
    setGameNotes('');
    setSessionName('');
    setSelectedGroupId(null);

  };

  const handleInstallClick = async () => {
    console.log('Install clicked, deferredPrompt:', deferredPrompt);
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };  

  const createGameHandler = async () => {
    if (!playerName.trim()) return;
    
    try {
      const player = {
        id: Date.now().toString(),
        name: playerName,
        venmoUsername,
        isHost: true,
        buyInsCents: [],
        totalBuyInCents: 0,
        finalChipsCents: null,
        netResultCents: 0
      };
      
      const gameData = {
        hostId: player.id,
        hostName: playerName,
        sessionName: sessionName || null,
        groupId: selectedGroupId || null, // Track which group this game belongs to
        players: [player],
        status: 'lobby'
      };
      
      const { gameId: newGameId, code } = await createGame(gameData);
      
      setGameId(newGameId);
      setGameCode(code);
      setCurrentPlayer(player);
      setPlayers([player]);
      setScreen('lobby');
      
      const unsub = subscribeToGame(newGameId, (gameData) => {
        setPlayers(gameData.players || []);
      });
      setUnsubscribe(() => unsub);
      
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    }
  };

  const copyCode = () => {
    const gameUrl = `${window.location.origin}${window.location.pathname}?code=${gameCode}`;
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = () => {
    const gameUrl = `${window.location.origin}${window.location.pathname}?code=${gameCode}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join my poker game!',
        text: `Join my poker game with code: ${gameCode}`,
        url: gameUrl,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateVenmoLink = (username, amountCents) => {
    const cleanUsername = username?.replace('@', '') || '';
    const amount = centsToDollars(amountCents);
    return `venmo://paycharge?txn=pay&recipients=${cleanUsername}&amount=${amount}&note=Poker%20game%20settlement`;
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white flex items-center justify-center">
        <div className="text-2xl font-bold text-amber-400">Loading...</div>
      </div>
    );
  }

  // Show auth screen if user is null (not signed in) and hasn't chosen guest mode
  if (user === null && user !== undefined) {
    return <Auth onAuthSuccess={(firebaseUser) => {
      setUser(firebaseUser || 'guest'); // 'guest' = guest mode
    }} />;
  }

  // Profile Screen
  if (screen === 'profile') {
    return (
      <ProfilePage 
        user={user}
        gameHistory={gameHistory}
        onUpdateProfile={async (updates) => {
          // Update Firebase user profile
          if (updates.displayName) {
            await import('firebase/auth').then(({ updateProfile }) => {
              updateProfile(auth.currentUser, { displayName: updates.displayName });
            });
          }
        }}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'home') {
    const stats = calculateStats();
    return (
      <div className="min-h-screen bg-poker-green relative overflow-hidden">
        {/* Felt texture overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 text-8xl opacity-10 text-poker-gold">♠</div>
        <div className="absolute bottom-20 left-10 text-8xl opacity-10 text-poker-gold">♥</div>
        
        <div className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
          {/* Top Right Buttons - Stacked */}
          <div className="absolute top-6 right-6 z-30 flex flex-col gap-2 items-end">
            {user && user !== 'guest' && user.email && (
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-12 h-12 bg-gradient-to-br from-poker-burgundy to-poker-burgundy-dark rounded-full flex items-center justify-center font-bold text-poker-cream border-2 border-poker-gold/50 hover:border-poker-gold transition shadow-lg"
              >
                {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
              </button>
            )}
            
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="px-3 py-2 bg-poker-gold hover:bg-poker-gold-light text-poker-green text-sm rounded-card font-semibold shadow-lg border-2 border-poker-gold-dark flex items-center gap-1 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install
              </button>
            )}
          </div>

          {/* Profile Dropdown */}
          {user && user !== 'guest' && user.email && showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowProfileMenu(false)}
              ></div>
              
              <div className="absolute right-6 top-20 w-64 bg-poker-green-light rounded-card-lg shadow-2xl border-2 border-poker-gold/30 overflow-hidden z-20">
                <div className="bg-gradient-to-r from-poker-burgundy to-poker-burgundy-dark p-4 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-poker-gold to-poker-gold-dark rounded-full flex items-center justify-center font-bold text-2xl text-poker-green mx-auto mb-2 border-4 border-poker-gold-light">
                    {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <div className="font-semibold text-poker-cream">{user.displayName || 'Player'}</div>
                  <div className="text-xs text-poker-grey">{user.email}</div>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setScreen('profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-poker-gold/20 rounded-lg transition text-left text-poker-cream"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Your Profile
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setScreen('settings');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-poker-gold/20 rounded-lg transition text-left text-poker-cream"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                  
                  <div className="border-t border-poker-gold/30 my-2"></div>
                  
                  <button
                    onClick={() => {
                      if (window.confirm('Sign out?')) {
                        auth.signOut();
                        setUser(undefined);
                        setGameHistory([]);
                        setSavedGroups([]);
                        setShowProfileMenu(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-poker-burgundy/20 rounded-lg transition text-left text-poker-burgundy"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Guest Mode Warning */}
          {user === 'guest' && (
            <div className="bg-poker-gold/20 border border-poker-gold rounded-card-lg p-3 mb-4 text-center mt-20">
              <p className="text-poker-gold text-sm font-semibold">⚠️ Guest Mode - History not saved</p>
              <button
                onClick={() => setUser(null)}
                className="text-poker-gold-light text-xs underline mt-1 hover:text-poker-gold-dark"
              >
                Sign in to save history
              </button>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8 pt-20">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 bg-gradient-to-br from-poker-burgundy to-poker-burgundy-dark border-4 border-poker-gold shadow-2xl">
              <DollarSign size={40} className="text-poker-gold" strokeWidth={3} />
            </div>
            <h1 className="text-6xl font-serif font-bold mb-2 text-poker-gold" style={{textShadow: '3px 3px 6px rgba(0,0,0,0.5)'}}>
              CashOut
            </h1>
            <div className="inline-block bg-poker-gold text-poker-green px-6 py-2 rounded-full text-sm font-bold tracking-wide shadow-lg">
              Settle Your Poker Games
            </div>
          </div>

          {/* Stats Cards */}
          {stats.totalGames > 0 && (
            <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-5 mb-6 border border-poker-gold/30 shadow-xl">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-poker-green/50 rounded-card p-3 border border-poker-gold/20">
                  <div className="text-3xl font-mono font-bold text-poker-gold">{stats.totalGames}</div>
                  <div className="text-xs text-poker-grey uppercase tracking-wide font-semibold">Games</div>
                </div>
                <div className="bg-poker-green/50 rounded-card p-3 border border-poker-gold/20">
                  <div className={`text-3xl font-mono font-bold ${parseFloat(stats.totalResult) >= 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                    ${stats.totalResult}
                  </div>
                  <div className="text-xs text-poker-grey uppercase tracking-wide font-semibold">Net</div>
                </div>
                <div className="bg-poker-green/50 rounded-card p-3 border border-poker-gold/20">
                  <div className="text-3xl font-mono font-bold text-poker-gold">{stats.winRate}%</div>
                  <div className="text-xs text-poker-grey uppercase tracking-wide font-semibold">Win Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-4 mb-6">
            <button
              onClick={() => setScreen('host')}
              className="w-full bg-gradient-to-r from-poker-burgundy to-poker-burgundy-dark hover:from-poker-burgundy-dark hover:to-poker-burgundy text-poker-cream font-bold py-5 px-6 rounded-card-lg flex items-center justify-center gap-3 transition shadow-xl border-2 border-poker-gold/50 hover:border-poker-gold"
            >
              <Users size={24} />
              <span className="text-lg tracking-wide font-serif">Host New Game</span>
            </button>
            <button
              onClick={() => setScreen('join')}
              className="w-full bg-gradient-to-r from-poker-gold to-poker-gold-dark hover:from-poker-gold-light hover:to-poker-gold text-poker-green font-bold py-5 px-6 rounded-card-lg flex items-center justify-center gap-3 transition shadow-xl border-2 border-poker-gold-dark"
            >
              <Plus size={24} />
              <span className="text-lg tracking-wide font-serif">Join Game</span>
            </button>
          </div>

          {/* Load Group Button */}
          {savedGroups.length > 0 && (
            <button
              onClick={() => { setScreen('groups'); }}
              className="w-full bg-poker-green-light hover:bg-poker-green text-poker-gold border-2 border-poker-gold/50 hover:border-poker-gold font-bold py-4 px-6 rounded-card-lg flex items-center justify-center gap-3 transition shadow-lg mb-4"
            >
              <Users size={24} />
              <span className="text-lg tracking-wide font-serif">Load Saved Group</span>
            </button>
          )}

          {/* Navigation Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setScreen('history')} className="bg-poker-green-light/80 backdrop-blur-sm hover:bg-poker-green-light text-poker-gold border border-poker-gold/30 hover:border-poker-gold/50 py-4 px-4 rounded-card flex flex-col items-center justify-center gap-1 transition font-semibold shadow-lg">
              <History size={20} />
              <span className="text-xs">History</span>
            </button>
            <button onClick={() => setScreen('stats')} className="bg-poker-green-light/80 backdrop-blur-sm hover:bg-poker-green-light text-poker-gold border border-poker-gold/30 hover:border-poker-gold/50 py-4 px-4 rounded-card flex flex-col items-center justify-center gap-1 transition font-semibold shadow-lg">
              <TrendingUp size={20} />
              <span className="text-xs">Stats</span>
            </button>
            <button onClick={() => setScreen('analytics')} className="bg-poker-green-light/80 backdrop-blur-sm hover:bg-poker-green-light text-poker-gold border border-poker-gold/30 hover:border-poker-gold/50 py-4 px-4 rounded-card flex flex-col items-center justify-center gap-1 transition font-semibold shadow-lg">
              <TrendingUp size={20} />
              <span className="text-xs">Analytics</span>
            </button>
            <button onClick={() => setScreen('leaderboards')} className="bg-poker-green-light/80 backdrop-blur-sm hover:bg-poker-green-light text-poker-gold border border-poker-gold/30 hover:border-poker-gold/50 py-4 px-4 rounded-card flex flex-col items-center justify-center gap-1 transition font-semibold shadow-lg">
              <span className="text-xl">🏆</span>
              <span className="text-xs">Leaders</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'host') {
    return (
      <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="max-w-md mx-auto pt-8 relative z-10">
          <h2 className="text-3xl font-serif font-bold mb-6 text-poker-gold">Host Game</h2>
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-xl">
            <label className="block text-sm text-poker-gold mb-2 font-semibold uppercase tracking-wide">Session Name (Optional)</label>
            <input 
              type="text" 
              value={sessionName} 
              onChange={(e) => setSessionName(e.target.value)} 
              placeholder="e.g., Sunday Runs with the Boys" 
              className="w-full bg-poker-green text-poker-cream px-4 py-3 rounded-card mb-4 border border-poker-gold/20 focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-poker-grey" 
            />
            <label className="block text-sm text-poker-gold mb-2 font-semibold uppercase tracking-wide">Your Name</label>
            <input 
              type="text" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)} 
              placeholder="Enter your name" 
              className="w-full bg-poker-green text-poker-cream px-4 py-3 rounded-card border border-poker-gold/20 focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-poker-grey" 
            />
          </div>
          <button 
            onClick={createGameHandler} 
            disabled={!playerName.trim()} 
            className="w-full bg-gradient-to-r from-poker-burgundy to-poker-burgundy-dark hover:from-poker-burgundy-dark hover:to-poker-burgundy disabled:from-gray-600 text-poker-cream font-bold py-4 rounded-card-lg mb-3 border-2 border-poker-gold/50 transition shadow-xl disabled:opacity-50"
          >
            Create Game
          </button>
          <button 
            onClick={resetApp} 
            className="w-full bg-poker-green-light text-poker-gold border border-poker-gold/30 py-3 rounded-card hover:border-poker-gold/50 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'join') {
    return (
      <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="max-w-md mx-auto pt-8 relative z-10">
          <h2 className="text-3xl font-serif font-bold mb-6 text-poker-gold">Join Game</h2>
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-xl">
            <label className="block text-sm text-poker-gold mb-2 font-semibold uppercase tracking-wide">Game Code</label>
            <input 
              type="text" 
              value={inputCode} 
              onChange={(e) => setInputCode(e.target.value.toUpperCase())} 
              maxLength={6} 
              className="w-full bg-poker-green text-poker-cream text-center text-2xl font-mono tracking-widest px-4 py-3 rounded-card mb-4 border border-poker-gold/20 focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-poker-grey uppercase" 
              placeholder="ABC123"
            />
            <label className="block text-sm text-poker-gold mb-2 font-semibold uppercase tracking-wide">Your Name</label>
            <input 
              type="text" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)} 
              placeholder="Enter your name" 
              className="w-full bg-poker-green text-poker-cream px-4 py-3 rounded-card mb-4 border border-poker-gold/20 focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-poker-grey" 
            />
            <label className="block text-sm text-poker-gold mb-2 font-semibold uppercase tracking-wide">Venmo Username (Optional)</label>
            <input 
              type="text" 
              value={venmoUsername} 
              onChange={(e) => setVenmoUsername(e.target.value)} 
              placeholder="@username" 
              className="w-full bg-poker-green text-poker-cream px-4 py-3 rounded-card border border-poker-gold/20 focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-poker-grey" 
            />
          </div>
          <button 
            onClick={joinGameHandler} 
            disabled={!inputCode.trim() || !playerName.trim()} 
            className="w-full bg-gradient-to-r from-poker-gold to-poker-gold-dark hover:from-poker-gold-light hover:to-poker-gold disabled:from-gray-600 text-poker-green font-bold py-4 rounded-card-lg mb-3 border-2 border-poker-gold-dark transition shadow-xl disabled:opacity-50"
          >
            Join Game
          </button>
          <button 
            onClick={resetApp} 
            className="w-full bg-poker-green-light text-poker-gold border border-poker-gold/30 py-3 rounded-card hover:border-poker-gold/50 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="max-w-md mx-auto pt-8 relative z-10">
          <h2 className="text-3xl font-serif font-bold mb-6 text-poker-gold">Game Lobby</h2>
          
          {/* Game Code Card */}
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-xl text-center">
            <div className="text-sm text-poker-grey mb-2 uppercase tracking-wide">Game Code</div>
            <div className="text-4xl font-mono font-bold text-poker-gold tracking-wider mb-4">{gameCode}</div>
            <div className="flex gap-2">
              <button 
                onClick={shareCode} 
                className="flex-1 bg-poker-gold hover:bg-poker-gold-light text-poker-green font-semibold py-2 rounded-card transition flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                Share
              </button>
              <button 
                onClick={copyCode} 
                className="flex-1 bg-poker-green border border-poker-gold/30 hover:border-poker-gold/50 text-poker-gold font-semibold py-2 rounded-card transition flex items-center justify-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Session Name */}
          {sessionName && (
            <div className="text-center mb-4">
              <div className="inline-block bg-poker-burgundy/30 border border-poker-burgundy text-poker-gold px-4 py-2 rounded-card text-sm font-serif italic">
                "{sessionName}"
              </div>
            </div>
          )}

          {/* Players List */}
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-4 mb-6 border-2 border-poker-gold/30 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-bold text-poker-gold">Players ({players.length})</h3>
              {currentPlayer?.isHost && players.length >= 2 && (
                <button 
                  onClick={startGame} 
                  className="bg-poker-gold hover:bg-poker-gold-light text-poker-green font-bold px-4 py-2 rounded-card transition text-sm"
                >
                  Start Game
                </button>
              )}
            </div>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-poker-green/50 p-3 rounded-card border border-poker-gold/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-poker-burgundy to-poker-burgundy-dark rounded-full flex items-center justify-center font-bold text-poker-gold border-2 border-poker-gold/50">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-poker-cream">{p.name}</div>
                      {p.isHost && <div className="text-xs text-poker-gold">👑 Host</div>}
                    </div>
                  </div>
                  {currentPlayer?.isHost && !p.isHost && (
                    <button 
                      onClick={() => kickPlayer(p.id)} 
                      className="text-poker-burgundy hover:text-poker-burgundy-light transition text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Group (Host Only) */}
          {currentPlayer?.isHost && players.length >= 2 && (
            <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-4 mb-6 border-2 border-poker-gold/30 shadow-xl">
              <label className="block text-sm text-poker-gold mb-2 font-semibold uppercase tracking-wide">Save This Group</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="flex-1 bg-poker-green text-poker-cream px-4 py-2 rounded-card border border-poker-gold/20 focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-poker-grey"
                />
                <button
                  onClick={saveGroup}
                  disabled={!newGroupName.trim()}
                  className="bg-poker-gold hover:bg-poker-gold-light disabled:bg-gray-600 text-poker-green font-semibold px-4 py-2 rounded-card transition disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={resetApp} 
            className="w-full bg-poker-burgundy hover:bg-poker-burgundy-light text-poker-cream font-bold py-3 rounded-card-lg border-2 border-poker-gold/50 transition shadow-lg"
          >
            Leave Game
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'game') {
    return (
      <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="max-w-4xl mx-auto pt-8 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-serif font-bold text-poker-gold">Active Game</h2>
              {sessionName && <p className="text-sm text-poker-grey italic">"{sessionName}"</p>}
            </div>
            <div className="text-right">
              <div className="text-sm text-poker-grey">Game Code</div>
              <div className="text-2xl font-mono font-bold text-poker-gold">{gameCode}</div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {players.map(p => (
              <div key={p.id} className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-4 border-2 border-poker-gold/30 shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-poker-burgundy to-poker-burgundy-dark rounded-full flex items-center justify-center font-bold text-poker-gold text-lg border-2 border-poker-gold/50">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-serif font-bold text-poker-cream">{p.name}</div>
                      {p.isHost && <div className="text-xs text-poker-gold">👑 Host</div>}
                    </div>
                  </div>
                  {currentPlayer?.isHost && !p.isHost && (
                    <button 
                      onClick={() => kickPlayer(p.id)} 
                      className="text-poker-burgundy hover:text-poker-burgundy-light transition text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Buy-in Input */}
                <div className="mb-3">
                  <label className="block text-xs text-poker-grey mb-1 uppercase tracking-wide">Buy-in Amount</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-poker-gold">$</span>
                      <input
                        type="text"
                        value={p.id === currentPlayer?.id ? buyInInput : ''}
                        onChange={(e) => p.id === currentPlayer?.id && setBuyInInput(e.target.value)}
                        disabled={p.id !== currentPlayer?.id}
                        placeholder="0.00"
                        className="w-full bg-poker-green text-poker-cream pl-7 pr-3 py-2 rounded-card border border-poker-gold/20 focus:outline-none focus:ring-2 focus:ring-poker-gold disabled:opacity-50 placeholder:text-poker-grey font-mono"
                      />
                    </div>
                    {p.id === currentPlayer?.id && (
                      <button
                        onClick={addBuyIn}
                        disabled={!buyInInput || parseFloat(buyInInput) <= 0}
                        className="bg-poker-gold hover:bg-poker-gold-light disabled:bg-gray-600 text-poker-green font-bold px-4 py-2 rounded-card transition disabled:opacity-50"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick amounts - only for current player */}
                {p.id === currentPlayer?.id && (
                  <div className="flex gap-2 mb-3">
                    {quickAmounts.map(amount => (
                      <button
                        key={amount}
                        onClick={() => setBuyInInput(amount.toString())}
                        className="flex-1 bg-poker-green hover:bg-poker-green-dark text-poker-gold text-xs py-1 rounded border border-poker-gold/20 hover:border-poker-gold/40 transition font-mono"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                )}

                {/* Buy-ins List */}
                {p.buyInsCents.length > 0 && (
                  <div className="bg-poker-green/50 p-2 rounded-card border border-poker-gold/20 mb-2">
                    <div className="text-xs text-poker-grey mb-1 uppercase tracking-wide">Buy-ins:</div>
                    <div className="flex flex-wrap gap-1">
                      {p.buyInsCents.map((buyIn, idx) => (
                        <span key={idx} className="text-xs bg-poker-gold/20 text-poker-gold px-2 py-0.5 rounded font-mono">
                          ${centsToDollars(buyIn)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Buy-in */}
                <div className="flex justify-between text-sm mb-2 bg-poker-green/50 p-2 rounded-card border border-poker-gold/20">
                  <span className="text-poker-grey">Total Buy-in:</span>
                  <span className="font-mono font-bold text-poker-cream">${centsToDollars(p.totalBuyInCents)}</span>
                </div>

                {/* Final Chips */}
                <div>
                  <label className="block text-xs text-poker-grey mb-1 uppercase tracking-wide">Final Chip Count</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-poker-gold">$</span>
                    <input
                      type="text"
                      value={p.finalChipsCents === null ? '' : centsToDollars(p.finalChipsCents)}
                      onChange={(e) => updateFinalChips(p.id, e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-poker-green text-poker-cream pl-7 pr-3 py-2 rounded-card border border-poker-gold/20 focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-poker-grey font-mono"
                    />
                  </div>
                </div>

                {/* Net Result */}
                {p.finalChipsCents !== null && (
                  <div className="mt-2 text-center">
                    <div className={`text-2xl font-mono font-bold ${p.netResultCents >= 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                      {p.netResultCents >= 0 ? '+' : ''}${centsToDollars(p.netResultCents)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* End Game Button */}
          {currentPlayer?.isHost && players.every(p => p.finalChipsCents !== null) && (
            <button
              onClick={endGame}
              className="w-full bg-gradient-to-r from-poker-burgundy to-poker-burgundy-dark hover:from-poker-burgundy-dark hover:to-poker-burgundy text-poker-cream font-bold py-4 rounded-card-lg mb-4 border-2 border-poker-gold/50 transition shadow-xl"
            >
              End Game & Calculate
            </button>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'settle') {
    const totalPot = players.reduce((sum, p) => sum + p.totalBuyInCents, 0);
    const totalChips = players.reduce((sum, p) => sum + (p.finalChipsCents || 0), 0);
    const balanced = Math.abs(totalPot - totalChips) <= 1;
    
    const calculateSettlement = async () => {
      if (!balanced || players.some(p => p.finalChipsCents === null)) {
        alert('Fix amounts first');
        return;
      }
      
      const updatedPlayers = players.map(p => ({
        ...p,
        netResultCents: (p.finalChipsCents || 0) - p.totalBuyInCents
      }));

      setPlayers(updatedPlayers);
      const transactions = optimizeSettlement(updatedPlayers);
      setSettlements(transactions);

      saveToHistory({
        date: new Date().toISOString(),
        code: gameCode,
        sessionName: sessionName || null,
        players: updatedPlayers.map(p => ({
          name: p.name,
          buyIn: centsToDollars(p.totalBuyInCents),
          result: centsToDollars(p.netResultCents)
        })),
        myResult: currentPlayer ? centsToDollars(updatedPlayers.find(p => p.id === currentPlayer.id)?.netResultCents || 0) : null,
        notes: gameNotes
      });

      if (gameId) {
        try {
          await updateGame(gameId, {
            players: updatedPlayers,
            settlements: transactions,
            status: 'completed'
          });
        } catch (error) {
          console.error('Error saving settlement:', error);
        }
      }

      setScreen('settlement');
    };
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          <h2 className="text-3xl font-bold mb-6 text-amber-400">FINAL COUNTS</h2>
          <div className="bg-black/40 rounded-lg p-4 mb-6 border border-amber-500/30">
            <div className="flex justify-between text-sm mb-1"><span className="text-amber-300">Buy-ins:</span><span>${centsToDollars(totalPot)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-amber-300">Chips:</span><span className={balanced ? 'text-emerald-400' : 'text-red-400'}>${centsToDollars(totalChips)}</span></div>
            {!balanced && totalChips > 0 && <div className="mt-2 text-xs text-red-400">⚠️ Off by ${centsToDollars(Math.abs(totalPot - totalChips))}</div>}
          </div>
          <div className="space-y-3 mb-6">
            {players.map((player, index) => {
              const isLastPlayer = index === players.length - 1;
              const otherPlayersHaveChips = players.slice(0, -1).every(p => p.finalChipsCents !== null);
              
              // Auto-calculate for last player
              if (isLastPlayer && otherPlayersHaveChips) {
                const otherChipsTotal = players.slice(0, -1).reduce((sum, p) => sum + (p.finalChipsCents || 0), 0);
                const autoChips = totalPot - otherChipsTotal;
                
                // Automatically set it if not already set or different
                if (player.finalChipsCents !== autoChips) {
                  setTimeout(() => {
                    const updatedPlayers = players.map(p =>
                      p.id === player.id ? { ...p, finalChipsCents: autoChips } : p
                    );
                    setPlayers(updatedPlayers);
                  }, 0);
                }
              }
              
              return (
                <div key={player.id} className="bg-green-800/50 rounded-lg p-4">
                  <div className="font-semibold mb-2">{player.name}</div>
                  <div className="text-sm text-amber-300/70 mb-3">Buy-in: ${centsToDollars(player.totalBuyInCents)}</div>
                  <label className="block text-sm text-amber-300 mb-2">Final Chips ($)</label>
                  {isLastPlayer && otherPlayersHaveChips ? (
                    <div className="w-full bg-blue-900/30 text-white px-4 py-3 rounded-lg border-2 border-blue-500/50 font-bold text-lg flex items-center justify-between">
                      <span>${centsToDollars(player.finalChipsCents || 0)}</span>
                      <span className="text-xs text-blue-300">AUTO</span>
                    </div>
                  ) : (
                    <input
                      type="tel"
                      value={player.inputValue !== undefined ? player.inputValue : (player.finalChipsCents !== null ? centsToDollars(player.finalChipsCents) : '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty, numbers, and one decimal point
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          const updatedPlayers = players.map(p =>
                            p.id === player.id ? { 
                              ...p, 
                              inputValue: value,
                              finalChipsCents: value === '' ? null : dollarsToCents(value)
                            } : p
                          );
                          setPlayers(updatedPlayers);
                        }
                      }}
                      onBlur={(e) => {
                        // Clean up the display value on blur
                        const value = e.target.value;
                        if (value && !value.includes('.')) {
                          const updatedPlayers = players.map(p =>
                            p.id === player.id ? { ...p, inputValue: undefined } : p
                          );
                          setPlayers(updatedPlayers);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-green-900/50 text-white px-4 py-3 rounded-lg border border-amber-500/20"
                      placeholder="0.00"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={calculateSettlement} disabled={!balanced} className="w-full bg-red-600 disabled:bg-gray-600 text-white font-bold py-4 rounded-xl mb-3 border-2 border-amber-500/50">CALCULATE</button>
          <button onClick={() => setScreen('game')} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg">Back</button>
        </div>
      </div>
    );
  }

  if (screen === 'settlement') {
    return (
      <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="max-w-4xl mx-auto pt-8 relative z-10">
          <h2 className="text-3xl font-serif font-bold mb-6 text-poker-gold text-center">Game Complete!</h2>

          {/* Final Results */}
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-xl">
            <h3 className="text-xl font-serif font-bold text-poker-gold mb-4">Final Results</h3>
            <div className="space-y-2">
              {players.sort((a, b) => b.netResultCents - a.netResultCents).map(p => (
                <div key={p.id} className="flex items-center justify-between bg-poker-green/50 p-3 rounded-card border border-poker-gold/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-poker-burgundy to-poker-burgundy-dark rounded-full flex items-center justify-center font-bold text-poker-gold border-2 border-poker-gold/50">
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-poker-cream">{p.name}</span>
                  </div>
                  <div className={`text-2xl font-mono font-bold ${p.netResultCents >= 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                    {p.netResultCents >= 0 ? '+' : ''}${centsToDollars(p.netResultCents)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settlements */}
          {settlements.length > 0 && (
            <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-xl">
              <h3 className="text-xl font-serif font-bold text-poker-gold mb-4">Settlement Plan</h3>
              <div className="space-y-3">
                {settlements.map((s, idx) => (
                  <div key={idx} className="bg-poker-green/50 p-4 rounded-card border border-poker-gold/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-poker-cream">{s.from}</span>
                        <ArrowRight className="text-poker-gold" size={20} />
                        <span className="font-semibold text-poker-cream">{s.to}</span>
                      </div>
                      <div className="text-xl font-mono font-bold text-poker-gold">
                        ${centsToDollars(s.amountCents)}
                      </div>
                    </div>
                    {s.toVenmo && (
                      <div className="flex gap-2">
                        <a
                          href={generateVenmoLink(s.toVenmo, s.amountCents)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-poker-gold hover:bg-poker-gold-light text-poker-green font-semibold py-2 rounded-card transition text-center"
                        >
                          Pay via Venmo
                        </a>
                        <button
                          onClick={() => markPaid(idx)}
                          className={`flex-1 ${s.paid ? 'bg-emerald-600' : 'bg-poker-green border border-poker-gold/30'} hover:opacity-80 text-poker-cream font-semibold py-2 rounded-card transition`}
                        >
                          {s.paid ? '✓ Paid' : 'Mark Paid'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game Notes */}
          <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-xl">
            <label className="block text-sm text-poker-gold mb-2 font-semibold uppercase tracking-wide">Game Notes (Optional)</label>
            <textarea
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              placeholder="How was the game? Any memorable hands?"
              className="w-full bg-poker-green text-poker-cream px-4 py-3 rounded-card border border-poker-gold/20 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-poker-grey"
            />
          </div>

          <button 
            onClick={resetApp} 
            className="w-full bg-gradient-to-r from-poker-burgundy to-poker-burgundy-dark hover:from-poker-burgundy-dark hover:to-poker-burgundy text-poker-cream font-bold py-4 rounded-card-lg border-2 border-poker-gold/50 transition shadow-xl"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

if (screen === 'history') {
  return (
    <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-poker-gold">Game History</h2>
          <button onClick={() => setScreen('home')} className="bg-poker-green-light text-poker-gold border border-poker-gold/30 px-4 py-2 rounded-card hover:border-poker-gold/50 transition">
            Back
          </button>
        </div>

        {gameHistory.length === 0 ? (
          <div className="text-center py-12 bg-poker-green-light/80 rounded-card-lg border-2 border-poker-gold/30">
            <History size={48} className="mx-auto mb-4 text-poker-gold/50" />
            <p className="text-poker-grey">No games yet. Start playing!</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {gameHistory.map((g, i) => (
              <div key={i} className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-4 border-2 border-poker-gold/30 hover:border-poker-gold/50 transition shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-serif font-semibold text-poker-gold">{new Date(g.date).toLocaleDateString()}</div>
                    {g.sessionName && <div className="text-sm text-poker-grey italic">"{g.sessionName}"</div>}
                    <div className="text-sm text-poker-grey">{g.players.length} players</div>
                  </div>
                  {g.myResult && (
                    <div className={`text-2xl font-mono font-bold ${parseFloat(g.myResult) > 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                      {parseFloat(g.myResult) > 0 ? '+' : ''}${g.myResult}
                    </div>
                  )}
                </div>
                <div className="text-xs text-poker-gold/60 font-mono">Code: {g.code}</div>
                {g.notes && <div className="text-sm text-poker-cream/80 mt-2 italic border-t border-poker-gold/20 pt-2">"{g.notes}"</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

if (screen === 'stats') {
  const stats = calculateStats();
  const myGames = gameHistory.filter(g => g.myResult !== null);
  const wins = myGames.filter(g => parseFloat(g.myResult) > 0);
  const losses = myGames.filter(g => parseFloat(g.myResult) < 0);
  
  return (
    <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-poker-gold">Your Stats</h2>
          <button onClick={() => setScreen('home')} className="bg-poker-green-light text-poker-gold border border-poker-gold/30 px-4 py-2 rounded-card hover:border-poker-gold/50 transition">
            Back
          </button>
        </div>

        {myGames.length === 0 ? (
          <div className="text-center py-12 bg-poker-green-light/80 rounded-card-lg border-2 border-poker-gold/30">
            <TrendingUp size={48} className="mx-auto mb-4 text-poker-gold/50" />
            <p className="text-poker-grey">Play some games to see your stats!</p>
          </div>
        ) : (
          <>
            {/* Net Profit/Loss Card */}
            <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 mb-6 border-2 border-poker-gold/30 shadow-xl">
              <div className="text-center mb-6">
                <div className="text-sm text-poker-grey mb-1 uppercase tracking-wide">Net Profit/Loss</div>
                <div className={`text-6xl font-mono font-bold ${parseFloat(stats.totalResult) > 0 ? 'text-emerald-300' : parseFloat(stats.totalResult) < 0 ? 'text-poker-burgundy' : 'text-poker-gold'}`}>
                  {parseFloat(stats.totalResult) > 0 ? '+' : ''}${stats.totalResult}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-poker-green/50 p-3 rounded-card border border-poker-gold/20">
                  <div className="text-2xl font-mono font-bold text-poker-gold">{stats.totalGames}</div>
                  <div className="text-xs text-poker-grey">Total Games</div>
                </div>
                <div className="text-center bg-poker-green/50 p-3 rounded-card border border-poker-gold/20">
                  <div className="text-2xl font-mono font-bold text-poker-gold">{stats.winRate}%</div>
                  <div className="text-xs text-poker-grey">Win Rate</div>
                </div>
                <div className="text-center bg-poker-green/50 p-3 rounded-card border border-poker-gold/20">
                  <div className="text-2xl font-mono font-bold text-emerald-300">{wins.length}W</div>
                  <div className="text-xs text-poker-grey">{losses.length}L</div>
                </div>
              </div>
            </div>

            {/* Breakdown Card */}
            <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 border-2 border-poker-gold/30 shadow-xl">
              <h3 className="text-xl font-serif font-bold text-poker-gold mb-4">Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between bg-poker-green/50 p-3 rounded-card border border-poker-gold/20">
                  <span className="text-poker-grey">Biggest Win</span>
                  <span className="font-mono font-bold text-emerald-300">
                    +${wins.length > 0 ? Math.max(...wins.map(g => parseFloat(g.myResult))).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between bg-poker-green/50 p-3 rounded-card border border-poker-gold/20">
                  <span className="text-poker-grey">Biggest Loss</span>
                  <span className="font-mono font-bold text-poker-burgundy">
                    ${losses.length > 0 ? Math.min(...losses.map(g => parseFloat(g.myResult))).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between bg-poker-green/50 p-3 rounded-card border border-poker-gold/20">
                  <span className="text-poker-grey">Average per Game</span>
                  <span className={`font-mono font-bold ${parseFloat(stats.totalResult) / stats.totalGames > 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                    {(parseFloat(stats.totalResult) / stats.totalGames > 0 ? '+' : '')}${(parseFloat(stats.totalResult) / stats.totalGames).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

if (screen === 'analytics') {
  const streaks = getStreakData();
  const monthlyData = getProfitByMonth();
  const dayStats = getBestWorstDays();
  const myGames = gameHistory.filter(g => g.myResult !== null);

  return (
    <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-poker-gold">Analytics</h2>
          <button onClick={() => setScreen('home')} className="bg-poker-green-light text-poker-gold border border-poker-gold/30 px-4 py-2 rounded-card hover:border-poker-gold/50 transition">
            Back
          </button>
        </div>

        {myGames.length === 0 ? (
          <div className="text-center py-12 bg-poker-green-light/80 rounded-card-lg border-2 border-poker-gold/30">
            <TrendingUp size={48} className="mx-auto mb-4 text-poker-gold/50" />
            <p className="text-poker-grey">Play some games to see analytics!</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 bg-poker-green-light/80 rounded-card p-1 border border-poker-gold/30">
              <button
                onClick={() => setAnalyticsView('overview')}
                className={`flex-1 py-2 rounded-card transition font-semibold ${
                  analyticsView === 'overview' ? 'bg-poker-gold text-poker-green' : 'text-poker-gold hover:text-poker-gold-light'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setAnalyticsView('trends')}
                className={`flex-1 py-2 rounded-card transition font-semibold ${
                  analyticsView === 'trends' ? 'bg-poker-gold text-poker-green' : 'text-poker-gold hover:text-poker-gold-light'
                }`}
              >
                Trends
              </button>
              <button
                onClick={() => setAnalyticsView('players')}
                className={`flex-1 py-2 rounded-card transition font-semibold ${
                  analyticsView === 'players' ? 'bg-poker-gold text-poker-green' : 'text-poker-gold hover:text-poker-gold-light'
                }`}
              >
                Players
              </button>
            </div>

            {/* Overview Tab */}
            {analyticsView === 'overview' && (
              <div className="space-y-6">
                {/* Streaks */}
                <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 border-2 border-poker-gold/30 shadow-xl">
                  <h3 className="text-xl font-serif font-bold text-poker-gold mb-4">Streaks</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-poker-green/50 rounded-card p-4 text-center border border-poker-gold/20">
                      <div className={`text-3xl font-mono font-bold ${streaks.currentStreak > 0 ? 'text-emerald-300' : streaks.currentStreak < 0 ? 'text-poker-burgundy' : 'text-poker-grey'}`}>
                        {streaks.currentStreak > 0 ? `+${streaks.currentStreak}` : streaks.currentStreak}
                      </div>
                      <div className="text-xs text-poker-grey mt-1">Current Streak</div>
                    </div>
                    <div className="bg-poker-green/50 rounded-card p-4 text-center border border-poker-gold/20">
                      <div className="text-3xl font-mono font-bold text-emerald-300">{streaks.longestWinStreak}</div>
                      <div className="text-xs text-poker-grey mt-1">Best Win Streak</div>
                    </div>
                    <div className="bg-poker-green/50 rounded-card p-4 text-center border border-poker-gold/20">
                      <div className="text-3xl font-mono font-bold text-poker-burgundy">{streaks.longestLoseStreak}</div>
                      <div className="text-xs text-poker-grey mt-1">Worst Lose Streak</div>
                    </div>
                  </div>
                </div>

                {/* Best Days */}
                <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 border-2 border-poker-gold/30 shadow-xl">
                  <h3 className="text-xl font-serif font-bold text-poker-gold mb-4">Performance by Day</h3>
                  <div className="space-y-2">
                    {dayStats.map((stat, idx) => (
                      <div key={stat.day} className="flex items-center justify-between bg-poker-green/50 rounded-card p-3 border border-poker-gold/20">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            idx === 0 ? 'bg-poker-gold text-poker-green' : 
                            idx === 1 ? 'bg-poker-grey text-poker-green' : 
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-600 text-white'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-poker-cream">{stat.day}</div>
                            <div className="text-xs text-poker-grey">{stat.games} games</div>
                          </div>
                        </div>
                        <div className={`text-xl font-mono font-bold ${stat.avgProfit >= 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                          {stat.avgProfit >= 0 ? '+' : ''}${stat.avgProfit.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trends Tab */}
            {analyticsView === 'trends' && (
              <div className="space-y-6">
                <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 border-2 border-poker-gold/30 shadow-xl">
                  <h3 className="text-xl font-serif font-bold text-poker-gold mb-4">Monthly Profit/Loss</h3>
                  {monthlyData.length > 0 ? (
                    <div className="space-y-2">
                      {monthlyData.map(data => (
                        <div key={data.month} className="flex items-center justify-between bg-poker-green/50 rounded-card p-3 border border-poker-gold/20">
                          <div>
                            <div className="font-semibold text-poker-cream">{data.month}</div>
                            <div className="text-xs text-poker-grey">{data.games} games</div>
                          </div>
                          <div className={`text-xl font-mono font-bold ${data.profit >= 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                            {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-poker-grey text-center">Not enough data yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Players Tab */}
            {analyticsView === 'players' && (
              <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 border-2 border-poker-gold/30 shadow-xl">
                <h3 className="text-xl font-serif font-bold text-poker-gold mb-4">Player Stats</h3>
                <p className="text-poker-grey text-center">Coming soon - Track performance against specific players</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

if (screen === 'leaderboards') {
  const overallLeaderboard = getOverallLeaderboard();

  return (
    <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-poker-gold">🏆 Leaderboards</h2>
          <button onClick={() => setScreen('home')} className="bg-poker-green-light text-poker-gold border border-poker-gold/30 px-4 py-2 rounded-card hover:border-poker-gold/50 transition">
            Back
          </button>
        </div>

        {/* Overall Leaderboard */}
        <div className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-6 border-2 border-poker-gold/30 shadow-xl">
          {overallLeaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-poker-grey">No games played yet!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overallLeaderboard.map((player, idx) => (
                <div key={player.name} className="bg-poker-green/50 rounded-card p-4 flex items-center gap-4 border border-poker-gold/20 hover:border-poker-gold/40 transition">
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    idx === 0 ? 'bg-poker-gold text-poker-green' :
                    idx === 1 ? 'bg-poker-grey text-poker-green' :
                    idx === 2 ? 'bg-amber-700 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="font-serif font-bold text-lg text-poker-cream">{player.name}</div>
                    <div className="flex gap-4 text-xs text-poker-grey">
                      <span>{player.games} games</span>
                      <span>{player.winRate}% win rate</span>
                      {player.avgProfit && <span>Avg: ${player.avgProfit}</span>}
                    </div>
                  </div>

                  {/* Total Profit */}
                  <div className="text-right">
                    <div className={`text-2xl font-mono font-bold ${player.totalProfit >= 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                      {player.totalProfit >= 0 ? '+' : ''}${player.totalProfit.toFixed(2)}
                    </div>
                    {player.biggestWin > 0 && (
                      <div className="text-xs text-emerald-300">
                        Best: +${player.biggestWin.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

if (screen === 'settings') {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        <h2 className="text-3xl font-bold mb-6 text-amber-400">SETTINGS</h2>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-black/40 rounded-lg p-1">
          <button
            onClick={() => setSettingsTab('account')}
            className={`flex-1 py-2 rounded-lg transition ${
              settingsTab === 'account' ? 'bg-amber-600 text-white' : 'text-amber-300'
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setSettingsTab('preferences')}
            className={`flex-1 py-2 rounded-lg transition ${
              settingsTab === 'preferences' ? 'bg-amber-600 text-white' : 'text-amber-300'
            }`}
          >
            Preferences
          </button>
        </div>

        {/* Account Settings Tab */}
        {settingsTab === 'account' && (
          <div className="space-y-4">
            {/* Display Name */}
            <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
              <label className="block text-sm text-amber-300 mb-2 font-semibold">DISPLAY NAME</label>
              {!editingDisplayName ? (
                <div className="flex items-center justify-between">
                  <span className="text-white text-lg">{userSettings.displayName}</span>
                  <button
                    onClick={() => {
                      setEditingDisplayName(true);
                      setNewDisplayName(userSettings.displayName);
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-white text-sm"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                    placeholder="Enter new display name"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDisplayName} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white">
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDisplayName(false);
                        setNewDisplayName('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
              <label className="block text-sm text-amber-300 mb-2 font-semibold">EMAIL</label>
              {!editingEmail ? (
                <div className="flex items-center justify-between">
                  <span className="text-white text-lg">{userSettings.email}</span>
                  <button
                    onClick={() => {
                      setEditingEmail(true);
                      setNewEmail(userSettings.email);
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-white text-sm"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                    placeholder="Enter new email"
                  />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                    placeholder="Current password (for re-auth)"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEmail} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white">
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingEmail(false);
                        setNewEmail('');
                        setCurrentPassword('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
              <label className="block text-sm text-amber-300 mb-2 font-semibold">PASSWORD</label>
              {!editingPassword ? (
                <div className="flex items-center justify-between">
                  <span className="text-white text-lg">••••••••</span>
                  <button
                    onClick={() => setEditingPassword(true)}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-white text-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                    placeholder="Current password"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                    placeholder="New password (min 6 chars)"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                    placeholder="Confirm new password"
                  />
                  <div className="flex gap-2">
                    <button onClick={savePassword} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white">
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setEditingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Account */}
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <label className="block text-sm text-red-400 mb-2 font-semibold">⚠️ DANGER ZONE</label>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
                >
                  Delete Account
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-red-300 text-sm mb-2">
                    Type <strong>DELETE</strong> to confirm
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-red-500 rounded text-white"
                    placeholder="Type DELETE"
                  />
                  <div className="flex gap-2">
                    <button onClick={deleteAccount} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white">
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}     
    
        {/* Game Preferences Tab */}
        {settingsTab === 'preferences' && (
          <div className="space-y-4">
            {/* Default Buy-in */}
            <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
              <label className="block text-sm text-amber-300 mb-2 font-semibold">DEFAULT BUY-IN</label>
              <div className="flex items-center gap-2">
                <span className="text-amber-400">$</span>
                <input
                  type="number"
                  value={userSettings.defaultBuyIn}
                  onChange={(e) => setUserSettings({...userSettings, defaultBuyIn: parseInt(e.target.value) || 0})}
                  className="w-32 px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                  min="0"
                />
                <span className="text-gray-400 text-sm">(auto-fills new sessions)</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
              <label className="block text-sm text-amber-300 mb-2 font-semibold">PREFERRED PAYMENT</label>
              <select
                value={userSettings.preferredPayment}
                onChange={(e) => setUserSettings({...userSettings, preferredPayment: e.target.value})}
                className="w-full px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
              >
                <option value="venmo">Venmo</option>
                <option value="cashapp">Cash App</option>
                <option value="zelle">Zelle</option>
                <option value="paypal">PayPal</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            {/* Currency */}
            <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
              <label className="block text-sm text-amber-300 mb-2 font-semibold">CURRENCY</label>
              <select
                value={userSettings.currency}
                onChange={(e) => setUserSettings({...userSettings, currency: e.target.value})}
                className="w-full px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="CAD">CAD - Canadian Dollar ($)</option>
                <option value="AUD">AUD - Australian Dollar ($)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
              </select>
            </div>

            {/* Quick Buy-in Amounts */}
            <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
              <label className="block text-sm text-amber-300 mb-2 font-semibold">QUICK BUY-IN AMOUNTS</label>
              {!editingQuickAmounts ? (
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {userSettings.quickBuyInAmounts.map((amount, index) => (
                      <span key={index} className="px-3 py-1 bg-green-600 text-white rounded-lg">
                        ${amount}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setEditingQuickAmounts(true);
                      setTempQuickAmounts([...userSettings.quickBuyInAmounts]);
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-white text-sm"
                  >
                    Customize
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {tempQuickAmounts.map((amount, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-amber-400">$</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => updateQuickAmount(index, e.target.value)}
                          className="w-32 px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                          min="0"
                        />
                        <button
                          onClick={() => removeQuickAmount(index)}
                          className="p-2 text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addQuickAmount}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm"
                  >
                    + Add Amount
                  </button>
                  <div className="flex gap-2 mt-3">
                    <button onClick={saveQuickAmounts} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white">
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingQuickAmounts(false);
                        setTempQuickAmounts([]);
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sound Effects */}
            <div className="bg-black/40 rounded-lg p-4 border border-amber-500/30">
              <label className="block text-sm text-amber-300 mb-2 font-semibold">SOUND EFFECTS</label>
              <div className="flex items-center justify-between">
                <span className="text-white">{userSettings.soundEnabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={() => setUserSettings({...userSettings, soundEnabled: !userSettings.soundEnabled})}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    userSettings.soundEnabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      userSettings.soundEnabled ? 'transform translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}   
        <button onClick={() => setScreen('home')} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg mt-6">
          Back
        </button>
      </div>
    </div>
  );
}

if (screen === 'groups') {
  return (
    <div className="min-h-screen bg-poker-green text-poker-cream p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-poker-gold">Saved Groups</h2>
          <button onClick={() => setScreen('home')} className="bg-poker-green-light text-poker-gold border border-poker-gold/30 px-4 py-2 rounded-card hover:border-poker-gold/50 transition">
            Back
          </button>
        </div>

        {savedGroups.length === 0 ? (
          <div className="text-center py-12 bg-poker-green-light/80 rounded-card-lg border-2 border-poker-gold/30">
            <Users size={48} className="mx-auto mb-4 text-poker-gold/50" />
            <p className="text-poker-grey">No saved groups yet</p>
            <p className="text-sm text-poker-grey/70 mt-2">Create a game and save your player group!</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {savedGroups.map(group => (
              <div key={group.id} className="bg-poker-green-light/80 backdrop-blur-sm rounded-card-lg p-4 border-2 border-poker-gold/30 hover:border-poker-gold/50 transition shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-serif font-semibold text-lg text-poker-gold">{group.name}</div>
                    <div className="text-sm text-poker-grey">{group.players.length} players: {group.players.map(p => p.name).join(', ')}</div>
                  </div>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="text-poker-burgundy hover:text-poker-burgundy-light text-xl transition"
                  >
                    ✕
                  </button>
                </div>
                <button
                  onClick={() => {
                    loadGroup(group);
                    setScreen('host');
                  }}
                  className="w-full bg-poker-gold hover:bg-poker-gold-light text-poker-green font-semibold py-2 rounded-card transition mt-2"
                >
                  Load Group
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

return null;
};

export default PokerSettleApp;