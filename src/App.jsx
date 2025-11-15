import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './Auth';
import ProfilePage from './ProfilePage';
import InstallPrompt from './InstallPrompt';
import UpdateNotification from './UpdateNotification';
import IOSInstallGuide from './IOSInstallGuide';
import { DollarSign, Users, Plus, Share2, Copy, Check, TrendingUp, History, ArrowRight } from 'lucide-react';
import { createGame, getGameByCode, updateGame, subscribeToGame, removePlayer, updatePaymentStatus } from './gameService';
import { soundManager } from './sounds';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  DangerButton,
  PremiumCard,
  GlassCard,
  BaseCard,
  StatCard,
  InlineStat,
  PremiumInput,
  CodeInput,
  StatusBadge,
  CountBadge,
  PlayerCard,
  GameHeader,
  PotDisplay,
  LoadingSpinner,
} from './components/PremiumUI';

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

  const joinGameHandler = async () => {
  if (!inputCode.trim() || !playerName.trim()) return;
  
  try {
    const gameData = await getGameByCode(inputCode);
    
    if (!gameData) {
      alert('Game not found. Please check the code.');
      return;
    }
    
    const newPlayer = {
      id: Date.now().toString(),
      name: playerName,
      venmoUsername,
      isHost: false,
      buyInsCents: [],
      totalBuyInCents: 0,
      finalChipsCents: null,
      netResultCents: 0
    };
    
    const updatedPlayers = [...gameData.players, newPlayer];
    await updateGame(gameData.id, { players: updatedPlayers });
    
    setGameId(gameData.id);
    setGameCode(inputCode);
    setCurrentPlayer(newPlayer);
    setPlayers(updatedPlayers);
    setSessionName(gameData.sessionName || '');
    setScreen('lobby');
    
    const unsub = subscribeToGame(gameData.id, (data) => {
      setPlayers(data.players || []);
    });
    setUnsubscribe(() => unsub);
    
  } catch (error) {
    console.error('Error joining game:', error);
    alert('Failed to join game. Please try again.');
  }
  };

  const addBuyIn = async () => {
    if (!buyInInput || parseFloat(buyInInput) <= 0) return;
    
    soundManager.play('chip');
    
    const amountCents = dollarsToCents(buyInInput);
    const updatedPlayers = players.map(p => {
      if (p.id === currentPlayer?.id) {
        return {
          ...p,
          buyInsCents: [...p.buyInsCents, amountCents],
          totalBuyInCents: p.totalBuyInCents + amountCents
        };
      }
      return p;
    });

    await updateGame(gameId, { players: updatedPlayers });
    setPlayers(updatedPlayers);
    setBuyInInput('');
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

  const startGame = async () => {
    soundManager.play('shuffle');
    setScreen('game');
  };

  const kickPlayer = async (playerId) => {
    if (!window.confirm('Remove this player?')) return;
    
    const updatedPlayers = players.filter(p => p.id !== playerId);
    await updateGame(gameId, { players: updatedPlayers });
    setPlayers(updatedPlayers);
  };

  const updateFinalChips = (playerId, value) => {
    const amountCents = dollarsToCents(value);
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        const netResultCents = amountCents - p.totalBuyInCents;
        return { ...p, finalChipsCents: amountCents, netResultCents };
      }
      return p;
    });
    setPlayers(updatedPlayers);
  };

  const endGame = async () => {
    const settlementsData = optimizeSettlement(players);
    setSettlements(settlementsData);
    setScreen('settlement');
    
    // Save to history
    const myPlayer = players.find(p => p.id === currentPlayer?.id);
    saveToHistory({
      date: new Date().toISOString(),
      code: gameCode,
      sessionName,
      players: players,
      myResult: myPlayer ? centsToDollars(myPlayer.netResultCents) : null,
      notes: gameNotes,
      groupId: selectedGroupId
    });
  };

  const markPaid = (index) => {
    soundManager.play('cashRegister');
    
    const updated = [...settlements];
    updated[index].paid = !updated[index].paid;
    setSettlements(updated);
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0A0E14] text-white flex items-center justify-center">
        <div className="text-2xl font-bold text-[#D4AF37]">Loading...</div>
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
      <>
      <InstallPrompt />
      <UpdateNotification />
      <IOSInstallGuide />
      <div className="min-h-screen bg-[#0A0E14] relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '48px 48px'
          }}
        />

        {/* Subtle Gradient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37] opacity-5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D4AF37] opacity-5 blur-[120px] rounded-full" />

        <div className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
          {/* Top Right Buttons - Stacked */}
          <div className="absolute top-6 right-6 z-30 flex flex-col gap-2 items-end">
            {user && user !== 'guest' && user.email && (
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-full flex items-center justify-center font-bold text-[#0A0E14] border-2 border-[#D4AF37]/20 hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_4px_16px_rgba(212,175,55,0.3)]"
              >
                {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
              </button>
            )}
            
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="px-3 py-2 bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] text-[#0A0E14] text-sm rounded-xl font-semibold shadow-[0_4px_16px_rgba(212,175,55,0.3)] flex items-center gap-1 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
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

              <div className="absolute right-6 top-20 w-64 bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden z-20">
                <div className="bg-gradient-to-r from-[#252B3D] to-[#2D3447] p-4 text-center border-b border-white/10">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-full flex items-center justify-center font-bold text-2xl text-[#0A0E14] mx-auto mb-2 shadow-[0_4px_16px_rgba(212,175,55,0.3)]">
                    {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <div className="font-semibold text-[#F8FAFC]">{user.displayName || 'Player'}</div>
                  <div className="text-xs text-[#CBD5E1]">{user.email}</div>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setScreen('profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#D4AF37]/10 rounded-xl transition-all duration-200 text-left text-[#CBD5E1] hover:text-[#F8FAFC]"
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
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#D4AF37]/10 rounded-xl transition-all duration-200 text-left text-[#CBD5E1] hover:text-[#F8FAFC]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>

                  <div className="border-t border-white/10 my-2"></div>

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
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#EF4444]/10 rounded-xl transition-all duration-200 text-left text-[#EF4444]"
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
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl p-3 mb-4 text-center mt-20">
              <p className="text-[#F59E0B] text-sm font-semibold">⚠️ Guest Mode - History not saved</p>
              <button
                onClick={() => setUser(null)}
                className="text-[#F59E0B] text-xs underline mt-1 hover:text-[#F59E0B]/80"
              >
                Sign in to save history
              </button>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-12 pt-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(212,175,55,0.3)]">
              <DollarSign size={40} className="text-[#0A0E14]" strokeWidth={3} />
            </div>

            <h1 className="text-5xl font-bold text-[#F8FAFC] mb-3 tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              Cashout
            </h1>

            <div className="inline-block">
              <div className="text-[#D4AF37] text-sm font-medium uppercase tracking-[0.2em] px-4 py-2 border border-[#D4AF37]/30 rounded-full">
                Poker Settlement
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats.totalGames > 0 && (
            <div className="mb-8">
              <PremiumCard className="p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-[#F8FAFC] text-2xl font-bold mb-1">
                      {stats.totalGames}
                    </div>
                    <div className="text-[#64748B] text-xs uppercase tracking-wider">
                      Games
                    </div>
                  </div>

                  <div>
                    <div className={`text-2xl font-bold mb-1 ${
                      parseFloat(stats.totalResult) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}>
                      {parseFloat(stats.totalResult) >= 0 ? '+' : ''}${stats.totalResult}
                    </div>
                    <div className="text-[#64748B] text-xs uppercase tracking-wider">
                      Net
                    </div>
                  </div>

                  <div>
                    <div className="text-[#F8FAFC] text-2xl font-bold mb-1">
                      {stats.winRate}%
                    </div>
                    <div className="text-[#64748B] text-xs uppercase tracking-wider">
                      Win Rate
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-3 mb-6">
            <PrimaryButton icon={Users} onClick={() => setScreen('host')}>
              Host New Game
            </PrimaryButton>

            <SecondaryButton icon={Plus} onClick={() => setScreen('join')}>
              Join Game
            </SecondaryButton>
          </div>

          {/* Load Group Button */}
          {savedGroups.length > 0 && (
            <div className="mb-4">
              <GhostButton icon={Users} onClick={() => setScreen('groups')}>
                Load Saved Group
              </GhostButton>
            </div>
          )}

          {/* Navigation Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setScreen('history')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <History size={18} strokeWidth={2} />
              <span className="text-xs">History</span>
            </button>

            <button
              onClick={() => setScreen('stats')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <TrendingUp size={18} strokeWidth={2} />
              <span className="text-xs">Stats</span>
            </button>

            <button
              onClick={() => setScreen('analytics')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <TrendingUp size={18} strokeWidth={2} />
              <span className="text-xs">Analytics</span>
            </button>

            <button
              onClick={() => setScreen('leaderboards')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <span className="text-xl">🏆</span>
              <span className="text-xs">Leaders</span>
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  if (screen === 'host') {
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
            onClick={resetApp}
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

          <div className="space-y-3">
            <PrimaryButton
              onClick={createGameHandler}
              disabled={!playerName.trim()}
            >
              Create Game
            </PrimaryButton>

            <GhostButton onClick={resetApp}>
              Cancel
            </GhostButton>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'join') {
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
            onClick={resetApp}
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
              onClick={joinGameHandler}
              disabled={!inputCode.trim() || !playerName.trim()}
            >
              Join Game
            </PrimaryButton>

            <GhostButton onClick={resetApp}>
              Cancel
            </GhostButton>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
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
                  onClick={startGame}
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

          <DangerButton onClick={resetApp}>
            Leave Game
          </DangerButton>
        </div>
      </div>
    );
  }

  if (screen === 'game') {
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-[#F8FAFC]">Active Game</h2>
              {sessionName && <p className="text-sm text-[#CBD5E1] italic">"{sessionName}"</p>}
            </div>
            <div className="text-right">
              <div className="text-xs text-[#64748B] uppercase tracking-wider">Code</div>
              <div className="text-2xl font-mono font-bold text-[#D4AF37]">{gameCode}</div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {players.map(p => (
              <PremiumCard key={p.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-full flex items-center justify-center font-bold text-[#0A0E14] text-lg shadow-[0_4px_16px_rgba(212,175,55,0.3)]">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[#F8FAFC]">{p.name}</div>
                      {p.isHost && <StatusBadge variant="info">Host</StatusBadge>}
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

                {/* Buy-in Input */}
                <div className="mb-3">
                  <label className="block text-xs text-[#64748B] mb-1 uppercase tracking-wide">Buy-in Amount</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]">$</span>
                      <input
                        type="text"
                        value={p.id === currentPlayer?.id ? buyInInput : ''}
                        onChange={(e) => p.id === currentPlayer?.id && setBuyInInput(e.target.value)}
                        disabled={p.id !== currentPlayer?.id}
                        placeholder="0.00"
                        className="w-full bg-[#12161F] text-[#F8FAFC] pl-7 pr-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 disabled:opacity-50 placeholder:text-[#64748B] font-mono transition-all duration-200"
                      />
                    </div>
                    {p.id === currentPlayer?.id && (
                      <button
                        onClick={addBuyIn}
                        disabled={!buyInInput || parseFloat(buyInInput) <= 0}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0E14] font-bold px-4 py-2 rounded-xl transition-all duration-200"
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
                        className="flex-1 bg-[#12161F] hover:bg-[#1A1F2E] text-[#D4AF37] text-xs py-1.5 rounded-lg border border-white/10 hover:border-[#D4AF37]/30 transition-all duration-200 font-mono"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                )}

                {/* Buy-ins List */}
                {p.buyInsCents.length > 0 && (
                  <div className="bg-[#12161F] p-2 rounded-xl border border-white/10 mb-2">
                    <div className="text-xs text-[#64748B] mb-1 uppercase tracking-wide">Buy-ins:</div>
                    <div className="flex flex-wrap gap-1">
                      {p.buyInsCents.map((buyIn, idx) => (
                        <span key={idx} className="text-xs bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-md font-mono border border-[#D4AF37]/30">
                          ${centsToDollars(buyIn)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Buy-in */}
                <div className="flex justify-between text-sm mb-2 bg-[#12161F] p-2 rounded-xl border border-white/10">
                  <span className="text-[#64748B]">Total Buy-in:</span>
                  <span className="font-mono font-bold text-[#F8FAFC]">${centsToDollars(p.totalBuyInCents)}</span>
                </div>

                {/* Final Chips */}
                <div>
                  <label className="block text-xs text-[#64748B] mb-1 uppercase tracking-wide">Final Chip Count</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]">$</span>
                    <input
                      type="text"
                      value={p.finalChipsCents === null ? '' : centsToDollars(p.finalChipsCents)}
                      onChange={(e) => updateFinalChips(p.id, e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#12161F] text-[#F8FAFC] pl-7 pr-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 placeholder:text-[#64748B] font-mono transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Net Result */}
                {p.finalChipsCents !== null && (
                  <div className="mt-2 text-center">
                    <div className={`text-2xl font-mono font-bold ${p.netResultCents >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {p.netResultCents >= 0 ? '+' : ''}${centsToDollars(p.netResultCents)}
                    </div>
                  </div>
                )}
              </PremiumCard>
            ))}
          </div>

          {/* End Game Button */}
          {currentPlayer?.isHost && players.every(p => p.finalChipsCents !== null) && (
            <PrimaryButton onClick={endGame}>
              End Game & Calculate
            </PrimaryButton>
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
      <div className="min-h-screen bg-[#0A0E14] text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">FINAL COUNTS</h2>
          <div className="bg-black/40 rounded-lg p-4 mb-6 border border-amber-500/30">
            <div className="flex justify-between text-sm mb-1"><span className="text-[#D4AF37]">Buy-ins:</span><span>${centsToDollars(totalPot)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#D4AF37]">Chips:</span><span className={balanced ? 'text-[#10B981]' : 'text-[#EF4444]'}>${centsToDollars(totalChips)}</span></div>
            {!balanced && totalChips > 0 && <div className="mt-2 text-xs text-[#EF4444]">⚠️ Off by ${centsToDollars(Math.abs(totalPot - totalChips))}</div>}
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
                <div key={player.id} className="bg-[#1E2433] rounded-lg p-4">
                  <div className="font-semibold mb-2">{player.name}</div>
                  <div className="text-sm text-[#D4AF37]/70 mb-3">Buy-in: ${centsToDollars(player.totalBuyInCents)}</div>
                  <label className="block text-sm text-[#D4AF37] mb-2">Final Chips ($)</label>
                  {isLastPlayer && otherPlayersHaveChips ? (
                    <div className="w-full bg-[#12161F] text-[#F8FAFC] px-4 py-3 rounded-lg border border-[#3B82F6]/30 font-bold text-lg flex items-center justify-between">
                      <span>${centsToDollars(player.finalChipsCents || 0)}</span>
                      <span className="text-xs text-[#3B82F6]">AUTO</span>
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
          <button onClick={() => setScreen('game')} className="w-full bg-black/40 text-[#D4AF37] border border-amber-500/30 py-3 rounded-lg">Back</button>
        </div>
      </div>
    );
  }

  if (screen === 'settlement') {
    return (
      <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 premium-pattern"></div>
        
        <div className="max-w-4xl mx-auto pt-8 relative z-10">
          <h2 className="text-3xl font-serif font-bold mb-6 text-[#D4AF37] text-center">Game Complete!</h2>

          {/* Final Results */}
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
            <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Final Results</h3>
            <div className="space-y-2">
              {players.sort((a, b) => b.netResultCents - a.netResultCents).map(p => (
                <div key={p.id} className="flex items-center justify-between bg-[#12161F] p-3 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-full flex items-center justify-center font-bold text-[#D4AF37] border-2 border-[#D4AF37]/50">
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-[#F8FAFC]">{p.name}</span>
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
            <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
              <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Settlement Plan</h3>
              <div className="space-y-3">
                {settlements.map((s, idx) => (
                  <div key={idx} className="bg-[#12161F] p-4 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#F8FAFC]">{s.from}</span>
                        <ArrowRight className="text-[#D4AF37]" size={20} />
                        <span className="font-semibold text-[#F8FAFC]">{s.to}</span>
                      </div>
                      <div className="text-xl font-mono font-bold text-[#D4AF37]">
                        ${centsToDollars(s.amountCents)}
                      </div>
                    </div>
                    {s.toVenmo && (
                      <div className="flex gap-2">
                        <a
                          href={generateVenmoLink(s.toVenmo, s.amountCents)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] text-[#0A0E14] font-semibold py-2 rounded-xl transition-all duration-200 text-center"
                        >
                          Pay via Venmo
                        </a>
                        <button
                          onClick={() => markPaid(idx)}
                          className={`flex-1 ${s.paid ? 'bg-[#10B981]' : 'bg-[#1E2433] border border-white/10'} hover:opacity-80 text-[#F8FAFC] font-semibold py-2 rounded-xl transition-all duration-200`}
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
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
            <label className="block text-sm text-[#D4AF37] mb-2 font-semibold uppercase tracking-wide">Game Notes (Optional)</label>
            <textarea
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              placeholder="How was the game? Any memorable hands?"
              className="w-full bg-[#0A0E14] text-[#F8FAFC] px-4 py-3 rounded-xl border border-white/10 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-[#64748B]"
            />
          </div>

          <button 
            onClick={resetApp} 
            className="w-full bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)] text-[#F8FAFC] font-bold py-4 rounded-2xl border-2 border-[#D4AF37]/50 transition-all duration-200 shadow-xl"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

if (screen === 'history') {
  return (
    <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 premium-pattern"></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-[#D4AF37]">Game History</h2>
          <button onClick={() => setScreen('home')} className="bg-[#1E2433] hover:bg-[#252B3D] text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-4 py-2 rounded-xl transition-all duration-200">
            Back
          </button>
        </div>

        {gameHistory.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl border border-white/10">
            <History size={48} className="mx-auto mb-4 text-[#D4AF37]/50" />
            <p className="text-[#64748B]">No games yet. Start playing!</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {gameHistory.map((g, i) => (
              <div key={i} className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-4 border border-white/10 hover:border-white/20 transition shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-serif font-semibold text-[#D4AF37]">{new Date(g.date).toLocaleDateString()}</div>
                    {g.sessionName && <div className="text-sm text-[#64748B] italic">"{g.sessionName}"</div>}
                    <div className="text-sm text-[#64748B]">{g.players.length} players</div>
                  </div>
                  {g.myResult && (
                    <div className={`text-2xl font-mono font-bold ${parseFloat(g.myResult) > 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                      {parseFloat(g.myResult) > 0 ? '+' : ''}${g.myResult}
                    </div>
                  )}
                </div>
                <div className="text-xs text-[#D4AF37]/60 font-mono">Code: {g.code}</div>
                {g.notes && <div className="text-sm text-[#F8FAFC]/80 mt-2 italic border-t border-[#D4AF37]/20 pt-2">"{g.notes}"</div>}
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
    <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 premium-pattern"></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-[#D4AF37]">Your Stats</h2>
          <button onClick={() => setScreen('home')} className="bg-[#1E2433] hover:bg-[#252B3D] text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-4 py-2 rounded-xl transition-all duration-200">
            Back
          </button>
        </div>

        {myGames.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl border border-white/10">
            <TrendingUp size={48} className="mx-auto mb-4 text-[#D4AF37]/50" />
            <p className="text-[#64748B]">Play some games to see your stats!</p>
          </div>
        ) : (
          <>
            {/* Net Profit/Loss Card */}
            <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
              <div className="text-center mb-6">
                <div className="text-sm text-[#64748B] mb-1 uppercase tracking-wide">Net Profit/Loss</div>
                <div className={`text-6xl font-mono font-bold ${parseFloat(stats.totalResult) > 0 ? 'text-emerald-300' : parseFloat(stats.totalResult) < 0 ? 'text-poker-burgundy' : 'text-[#D4AF37]'}`}>
                  {parseFloat(stats.totalResult) > 0 ? '+' : ''}${stats.totalResult}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-[#12161F] p-3 rounded-xl border border-white/10">
                  <div className="text-2xl font-mono font-bold text-[#D4AF37]">{stats.totalGames}</div>
                  <div className="text-xs text-[#64748B]">Total Games</div>
                </div>
                <div className="text-center bg-[#12161F] p-3 rounded-xl border border-white/10">
                  <div className="text-2xl font-mono font-bold text-[#D4AF37]">{stats.winRate}%</div>
                  <div className="text-xs text-[#64748B]">Win Rate</div>
                </div>
                <div className="text-center bg-[#12161F] p-3 rounded-xl border border-white/10">
                  <div className="text-2xl font-mono font-bold text-emerald-300">{wins.length}W</div>
                  <div className="text-xs text-[#64748B]">{losses.length}L</div>
                </div>
              </div>
            </div>

            {/* Breakdown Card */}
            <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 border border-white/10 shadow-xl">
              <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between bg-[#12161F] p-3 rounded-xl border border-white/10">
                  <span className="text-[#64748B]">Biggest Win</span>
                  <span className="font-mono font-bold text-emerald-300">
                    +${wins.length > 0 ? Math.max(...wins.map(g => parseFloat(g.myResult))).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between bg-[#12161F] p-3 rounded-xl border border-white/10">
                  <span className="text-[#64748B]">Biggest Loss</span>
                  <span className="font-mono font-bold text-poker-burgundy">
                    ${losses.length > 0 ? Math.min(...losses.map(g => parseFloat(g.myResult))).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between bg-[#12161F] p-3 rounded-xl border border-white/10">
                  <span className="text-[#64748B]">Average per Game</span>
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
    <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 premium-pattern"></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-[#D4AF37]">Analytics</h2>
          <button onClick={() => setScreen('home')} className="bg-[#1E2433] hover:bg-[#252B3D] text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-4 py-2 rounded-xl transition-all duration-200">
            Back
          </button>
        </div>

        {myGames.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl border border-white/10">
            <TrendingUp size={48} className="mx-auto mb-4 text-[#D4AF37]/50" />
            <p className="text-[#64748B]">Play some games to see analytics!</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 bg-[#12161F] rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setAnalyticsView('overview')}
                className={`flex-1 py-2 rounded-xl transition font-semibold ${
                  analyticsView === 'overview' ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]' : 'text-[#CBD5E1] hover:text-[#F8FAFC]'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setAnalyticsView('trends')}
                className={`flex-1 py-2 rounded-xl transition font-semibold ${
                  analyticsView === 'trends' ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]' : 'text-[#CBD5E1] hover:text-[#F8FAFC]'
                }`}
              >
                Trends
              </button>
              <button
                onClick={() => setAnalyticsView('players')}
                className={`flex-1 py-2 rounded-xl transition font-semibold ${
                  analyticsView === 'players' ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]' : 'text-[#CBD5E1] hover:text-[#F8FAFC]'
                }`}
              >
                Players
              </button>
            </div>

            {/* Overview Tab */}
            {analyticsView === 'overview' && (
              <div className="space-y-6">
                {/* Streaks */}
                <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 border border-white/10 shadow-xl">
                  <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Streaks</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#12161F] rounded-xl p-4 text-center border border-white/10">
                      <div className={`text-3xl font-mono font-bold ${streaks.currentStreak > 0 ? 'text-emerald-300' : streaks.currentStreak < 0 ? 'text-poker-burgundy' : 'text-[#64748B]'}`}>
                        {streaks.currentStreak > 0 ? `+${streaks.currentStreak}` : streaks.currentStreak}
                      </div>
                      <div className="text-xs text-[#64748B] mt-1">Current Streak</div>
                    </div>
                    <div className="bg-[#12161F] rounded-xl p-4 text-center border border-white/10">
                      <div className="text-3xl font-mono font-bold text-emerald-300">{streaks.longestWinStreak}</div>
                      <div className="text-xs text-[#64748B] mt-1">Best Win Streak</div>
                    </div>
                    <div className="bg-[#12161F] rounded-xl p-4 text-center border border-white/10">
                      <div className="text-3xl font-mono font-bold text-poker-burgundy">{streaks.longestLoseStreak}</div>
                      <div className="text-xs text-[#64748B] mt-1">Worst Lose Streak</div>
                    </div>
                  </div>
                </div>

                {/* Best Days */}
                <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 border border-white/10 shadow-xl">
                  <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Performance by Day</h3>
                  <div className="space-y-2">
                    {dayStats.map((stat, idx) => (
                      <div key={stat.day} className="flex items-center justify-between bg-[#12161F] rounded-xl p-3 border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            idx === 0 ? 'bg-gradient-to-br from-[#D4AF37] to-[#C9A942] text-[#0A0E14]' :
                            idx === 1 ? 'bg-gradient-to-br from-[#94A3B8] to-[#64748B] text-[#0A0E14]' :
                            idx === 2 ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-[#0A0E14]' : 'bg-[#475569] text-[#F8FAFC]'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-[#F8FAFC]">{stat.day}</div>
                            <div className="text-xs text-[#64748B]">{stat.games} games</div>
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
                <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 border border-white/10 shadow-xl">
                  <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Monthly Profit/Loss</h3>
                  {monthlyData.length > 0 ? (
                    <div className="space-y-2">
                      {monthlyData.map(data => (
                        <div key={data.month} className="flex items-center justify-between bg-[#12161F] rounded-xl p-3 border border-white/10">
                          <div>
                            <div className="font-semibold text-[#F8FAFC]">{data.month}</div>
                            <div className="text-xs text-[#64748B]">{data.games} games</div>
                          </div>
                          <div className={`text-xl font-mono font-bold ${data.profit >= 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                            {data.profit >= 0 ? '+' : ''}${data.profit.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#64748B] text-center">Not enough data yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Players Tab */}
            {analyticsView === 'players' && (
              <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 border border-white/10 shadow-xl">
                <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Player Stats</h3>
                <p className="text-[#64748B] text-center">Coming soon - Track performance against specific players</p>
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
    <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 premium-pattern"></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-[#D4AF37]">🏆 Leaderboards</h2>
          <button onClick={() => setScreen('home')} className="bg-[#1E2433] hover:bg-[#252B3D] text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-4 py-2 rounded-xl transition-all duration-200">
            Back
          </button>
        </div>

        {/* Overall Leaderboard */}
        <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 border border-white/10 shadow-xl">
          {overallLeaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#64748B]">No games played yet!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overallLeaderboard.map((player, idx) => (
                <div key={player.name} className="bg-[#12161F] rounded-xl p-4 flex items-center gap-4 border border-white/10 hover:border-[#D4AF37]/50 transition-all duration-200">
                  {/* Rank Badge */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    idx === 0 ? 'bg-gradient-to-br from-[#D4AF37] to-[#C9A942] text-[#0A0E14]' :
                    idx === 1 ? 'bg-gradient-to-br from-[#94A3B8] to-[#64748B] text-[#0A0E14]' :
                    idx === 2 ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-[#0A0E14]' :
                    'bg-[#475569] text-[#F8FAFC]'
                  }`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="font-serif font-bold text-lg text-[#F8FAFC]">{player.name}</div>
                    <div className="flex gap-4 text-xs text-[#64748B]">
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
    <div className="min-h-screen bg-[#0A0E14] text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        <h2 className="text-3xl font-bold mb-6 text-[#D4AF37]">SETTINGS</h2>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-black/40 rounded-lg p-1">
          <button
            onClick={() => setSettingsTab('account')}
            className={`flex-1 py-2 rounded-lg transition ${
              settingsTab === 'account' ? 'bg-amber-600 text-white' : 'text-[#D4AF37]'
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setSettingsTab('preferences')}
            className={`flex-1 py-2 rounded-lg transition ${
              settingsTab === 'preferences' ? 'bg-amber-600 text-white' : 'text-[#D4AF37]'
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
              <label className="block text-sm text-[#D4AF37] mb-2 font-semibold">DISPLAY NAME</label>
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
              <label className="block text-sm text-[#D4AF37] mb-2 font-semibold">EMAIL</label>
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
              <label className="block text-sm text-[#D4AF37] mb-2 font-semibold">PASSWORD</label>
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
              <label className="block text-sm text-[#EF4444] mb-2 font-semibold">⚠️ DANGER ZONE</label>
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
              <label className="block text-sm text-[#D4AF37] mb-2 font-semibold">DEFAULT BUY-IN</label>
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37]">$</span>
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
              <label className="block text-sm text-[#D4AF37] mb-2 font-semibold">PREFERRED PAYMENT</label>
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
              <label className="block text-sm text-[#D4AF37] mb-2 font-semibold">CURRENCY</label>
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
              <label className="block text-sm text-[#D4AF37] mb-2 font-semibold">QUICK BUY-IN AMOUNTS</label>
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
                        <span className="text-[#D4AF37]">$</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => updateQuickAmount(index, e.target.value)}
                          className="w-32 px-3 py-2 bg-green-900/50 border border-amber-500/20 rounded text-white"
                          min="0"
                        />
                        <button
                          onClick={() => removeQuickAmount(index)}
                          className="p-2 text-[#EF4444] hover:text-red-300"
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
              <label className="block text-sm text-[#D4AF37] mb-2 font-semibold">SOUND EFFECTS</label>
              <div className="flex items-center justify-between">
                <span className="text-white">{userSettings.soundEnabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  onClick={() => {
                    const newValue = !userSettings.soundEnabled;
                    setUserSettings({...userSettings, soundEnabled: newValue});
                    soundManager.setEnabled(newValue);
                  }}
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
        <button onClick={() => setScreen('home')} className="w-full bg-black/40 text-[#D4AF37] border border-amber-500/30 py-3 rounded-lg mt-6">
          Back
        </button>
      </div>
    </div>
  );
}

if (screen === 'groups') {
  return (
    <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 premium-pattern"></div>
      
      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-serif font-bold text-[#D4AF37]">Saved Groups</h2>
          <button onClick={() => setScreen('home')} className="bg-[#1E2433] hover:bg-[#252B3D] text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-4 py-2 rounded-xl transition-all duration-200">
            Back
          </button>
        </div>

        {savedGroups.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl border border-white/10">
            <Users size={48} className="mx-auto mb-4 text-[#D4AF37]/50" />
            <p className="text-[#64748B]">No saved groups yet</p>
            <p className="text-sm text-[#64748B]/70 mt-2">Create a game and save your player group!</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {savedGroups.map(group => (
              <div key={group.id} className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-4 border border-white/10 hover:border-white/20 transition shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-serif font-semibold text-lg text-[#D4AF37]">{group.name}</div>
                    <div className="text-sm text-[#64748B]">{group.players.length} players: {group.players.map(p => p.name).join(', ')}</div>
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
                  className="w-full bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] text-[#0A0E14] font-semibold py-2 rounded-xl transition-all duration-200 mt-2"
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

return <InstallPrompt />;
};

export default PokerSettleApp;