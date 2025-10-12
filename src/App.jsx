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
  setShowGroupSelector(false);
};

const deleteGroup = (groupId) => {
  if (!window.confirm('Delete this group?')) return;
  const updated = savedGroups.filter(g => g.id !== groupId);
  setSavedGroups(updated);
  localStorage.setItem('pokerGameGroups', JSON.stringify(updated));
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
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>
        <div className="absolute top-10 right-10 text-8xl opacity-5">♠</div>
        <div className="absolute bottom-20 left-10 text-8xl opacity-5">♥</div>
        
        <div className="max-w-md mx-auto relative z-10">

        {/* Top Right Buttons */}
        <div className="absolute top-6 right-6 z-30 flex gap-3 items-center">
          {(showInstallButton || true) && (
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-lg border-2 border-amber-400/50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Install App
            </button>
          )}

          {user && user !== 'guest' && user.email && (
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center font-bold text-white border-2 border-amber-500/50 hover:from-red-700 hover:to-red-800 transition shadow-lg"
            >
              {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
            </button>
          )}
        </div>
            
            {user && user !== 'guest' && user.email && showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowProfileMenu(false)}
                ></div>
                
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-2xl border-2 border-amber-500/30 overflow-hidden z-20">
                  <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center font-bold text-2xl text-slate-900 mx-auto mb-2 border-4 border-amber-200">
                      {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                    <div className="font-bold text-white">{user.displayName || 'Player'}</div>
                    <div className="text-xs text-amber-100">{user.email}</div>
                  </div>
                  
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setScreen('profile');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-500/20 rounded-lg transition text-left text-amber-200"
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-500/20 rounded-lg transition text-left text-amber-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                    
                    <div className="border-t border-amber-500/30 my-2"></div>
                    
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/20 rounded-lg transition text-left text-red-400"
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

        {user === 'guest' && (
          <div className="bg-amber-500/20 border border-amber-500 rounded-lg p-3 mb-4 text-center">
            <p className="text-amber-200 text-sm font-semibold">⚠️ Guest Mode - History not saved</p>
            <button
              onClick={() => setUser(null)}
              className="text-amber-400 text-xs underline mt-1"
            >
              Sign in to save history
            </button>
          </div>
        )}
          <div className="text-center mb-8 pt-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4"
                 style={{
                   background: 'linear-gradient(145deg, #dc2626, #991b1b)',
                   boxShadow: '0 8px 32px rgba(220, 38, 38, 0.4), inset 0 0 0 4px #fef3c7, inset 0 0 0 8px #dc2626'
                 }}>
              <DollarSign size={40} className="text-amber-100" strokeWidth={3} />
            </div>
            <h1 className="text-5xl font-bold mb-2 tracking-tight" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
              CASHOUT
            </h1>
            <div className="inline-block bg-amber-500 text-green-900 px-4 py-1 rounded-full text-sm font-bold tracking-wide">
              SETTLE YOUR POKER GAMES
            </div>
          </div>

          {stats.totalGames > 0 && (
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-5 mb-6 border-2 border-amber-500/30">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-800/50 rounded-lg p-3">
                  <div className="text-3xl font-bold text-amber-400">{stats.totalGames}</div>
                  <div className="text-xs text-amber-200/70 uppercase tracking-wide font-semibold">Games</div>
                </div>
                <div className="bg-green-800/50 rounded-lg p-3">
                  <div className={`text-3xl font-bold ${parseFloat(stats.totalResult) >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                    ${stats.totalResult}
                  </div>
                  <div className="text-xs text-amber-200/70 uppercase tracking-wide font-semibold">Net</div>
                </div>
                <div className="bg-green-800/50 rounded-lg p-3">
                  <div className="text-3xl font-bold text-amber-400">{stats.winRate}%</div>
                  <div className="text-xs text-amber-200/70 uppercase tracking-wide font-semibold">Win Rate</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <button
              onClick={() => setScreen('host')}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-5 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-lg border-2 border-amber-500/50"
            >
              <Users size={24} />
              <span className="text-lg tracking-wide">HOST NEW GAME</span>
            </button>
            <button
              onClick={() => setScreen('join')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-5 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-lg border-2 border-amber-500/50"
            >
              <Plus size={24} />
              <span className="text-lg tracking-wide">JOIN GAME</span>
            </button>
          </div>
          <button
            onClick={() => {
              console.log('Prompt available:', deferredPrompt);
              if (deferredPrompt) {
                handleInstallClick();
              } else {
                alert('Install prompt not available. Try: 1) Use HTTPS/localhost 2) Clear site data 3) Use Chrome/Edge');
              }
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg"
          >
            Test Install (Dev Only)
          </button>
          {savedGroups.length > 0 && (
            <button
              onClick={() => { setScreen('groups'); }}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-lg border-2 border-amber-500/50 mb-4"
            >
              <Users size={24} />
              <span className="text-lg tracking-wide">LOAD SAVED GROUP</span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setScreen('history')} className="bg-black/40 backdrop-blur-sm hover:bg-black/60 text-amber-300 border border-amber-500/30 py-4 px-4 rounded-lg flex items-center justify-center gap-2 transition font-semibold">
              <History size={20} />
              History
            </button>
            <button onClick={() => setScreen('stats')} className="bg-black/40 backdrop-blur-sm hover:bg-black/60 text-amber-300 border border-amber-500/30 py-4 px-4 rounded-lg flex items-center justify-center gap-2 transition font-semibold">
              <TrendingUp size={20} />
              Stats
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'host') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          <h2 className="text-3xl font-bold mb-6 text-amber-400">HOST GAME</h2>
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 mb-6 border-2 border-amber-500/30">
            <label className="block text-sm text-amber-300 mb-2 font-semibold">SESSION NAME (OPTIONAL)</label>
            <input 
              type="text" 
              value={sessionName} 
              onChange={(e) => setSessionName(e.target.value)} 
              placeholder="e.g., Sunday Runs with the Boys" 
              className="w-full bg-green-900/50 text-white px-4 py-3 rounded-lg mb-4 border border-amber-500/20" 
            />
            <label className="block text-sm text-amber-300 mb-2 font-semibold">YOUR NAME</label>
            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter your name" className="w-full bg-green-900/50 text-white px-4 py-3 rounded-lg border border-amber-500/20" />
          </div>
          <button onClick={createGameHandler} disabled={!playerName.trim()} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 text-white font-bold py-4 rounded-xl mb-3 border-2 border-amber-500/50">CREATE GAME</button>
          <button onClick={resetApp} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg">Back</button>
        </div>
      </div>
    );
  }

  if (screen === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          <h2 className="text-3xl font-bold mb-6 text-amber-400">JOIN GAME</h2>
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 mb-6 border-2 border-amber-500/30">
            <label className="block text-sm text-amber-300 mb-2 font-semibold">GAME CODE</label>
            <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} maxLength={6} className="w-full bg-green-900/50 text-white px-4 py-3 rounded-lg mb-4 text-center text-2xl font-mono border border-amber-500/20" />
            <label className="block text-sm text-amber-300 mb-2 font-semibold">YOUR NAME</label>
            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-green-900/50 text-white px-4 py-3 rounded-lg border border-amber-500/20" />
          </div>
          <button onClick={async () => {
            if (!playerName.trim() || !inputCode.trim()) return;
            
            try {
              const game = await getGameByCode(inputCode.toUpperCase());
              
              const player = {
                id: Date.now().toString(),
                name: playerName,
                venmoUsername,
                isHost: false,
                buyInsCents: [],
                totalBuyInCents: 0,
                finalChipsCents: null,
                netResultCents: 0
              };
              
              const updatedPlayers = [...game.players, player];
              
              await updateGame(game.id, { players: updatedPlayers });
              
              setGameId(game.id);
              setGameCode(game.code);
              setCurrentPlayer(player);
              setPlayers(updatedPlayers);
              setScreen('lobby');
              
              const unsub = subscribeToGame(game.id, (gameData) => {
                setPlayers(gameData.players || []);
              });
              setUnsubscribe(() => unsub);
              
            } catch (error) {
              console.error('Error joining game:', error);
              alert('Invalid game code or game not found!');
            }
          }} disabled={!playerName.trim() || inputCode.length !== 6} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 disabled:from-gray-600 text-white font-bold py-4 rounded-xl mb-3 border-2 border-amber-500/50">JOIN</button>
          <button onClick={resetApp} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg">Back</button>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          <h2 className="text-3xl font-bold mb-2 text-amber-400">LOBBY</h2>
          {sessionName && <p className="text-amber-200/70 mb-4 text-lg italic">"{sessionName}"</p>}
          {!sessionName && <div className="mb-4"></div>}
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 mb-6 border-2 border-amber-500/30">
            <div className="text-center mb-4">
              <div className="text-sm text-amber-300 mb-2 font-semibold">GAME CODE</div>
              <div className="text-5xl font-bold tracking-widest text-amber-400 mb-4">{gameCode}</div>
              
              {/* Share Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={shareCode}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 border border-amber-500/30"
                >
                  <Share2 size={18} />
                  Share Link
                </button>
                <button 
                  onClick={copyCode}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 border border-amber-500/30"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              
              {/* Show the actual URL that will be shared */}
              <div className="mt-3 text-xs text-amber-200/60 font-mono break-all">
                {window.location.origin}{window.location.pathname}?code={gameCode}
              </div>
            </div>
          </div>
          <div className="bg-black/40 rounded-xl p-6 mb-6 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-3">PLAYERS ({players.length})</div>
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-green-800/50 p-3 rounded-lg mb-2 border border-amber-500/20">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-bold">{p.name[0].toUpperCase()}</div>
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  {p.isHost && <div className="text-xs text-amber-400">HOST</div>}
                </div>
                {currentPlayer?.isHost && !p.isHost && (
                  <button 
                    onClick={async () => {
                      if (window.confirm(`Remove ${p.name} from the game?`)) {
                        try {
                          const updated = await removePlayer(gameId, p.id, players);
                          setPlayers(updated);
                        } catch (error) {
                          console.error('Error removing player:', error);
                          alert('Failed to remove player');
                        }
                      }
                    }}
                    className="bg-red-500/50 hover:bg-red-500 px-3 py-1 rounded text-xs font-semibold border border-red-400/30"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {currentPlayer?.isHost && players.length >= 2 && !showGroupSelector && (
            <div className="bg-black/40 rounded-xl p-4 mb-4 border border-amber-500/30">
              <div className="text-xs text-amber-300 mb-2 uppercase">Save as Group</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name (e.g., Friday Night Crew)"
                  className="flex-1 bg-green-900/50 text-white px-3 py-2 rounded-lg text-sm border border-amber-500/20"
                />
                <button
                  onClick={saveGroup}
                  className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          )}
          {currentPlayer?.isHost && (
            <button onClick={async () => { 
              if (players.length < 2) { alert('Need 2+ players'); return; }
              if (gameId) {
                await updateGame(gameId, { status: 'active' });
              }
              setScreen('game');
            }} 
            className="w-full bg-red-600 text-white font-bold py-4 rounded-xl mb-3 border-2 border-amber-500/50">START GAME</button>
          )}
          <button onClick={resetApp} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg">Leave</button>
        </div>
      </div>
    );
  }

  if (screen === 'game') {
    const totalPot = players.reduce((sum, p) => sum + p.totalBuyInCents, 0);
    
    const addBuyIn = async (playerId, amount) => {
      const amountCents = typeof amount === 'number' ? amount * 100 : dollarsToCents(amount);
      if (amountCents <= 0) return;
      
      const updatedPlayers = players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            buyInsCents: [...p.buyInsCents, amountCents],
            totalBuyInCents: p.totalBuyInCents + amountCents
          };
        }
        return p;
      });
      
      setPlayers(updatedPlayers);
      setBuyInInput('');
      
      if (gameId) {
        try {
          await updateGame(gameId, { players: updatedPlayers });
        } catch (error) {
          console.error('Error updating buy-in:', error);
        }
      }
    };
    const deleteBuyIn = async (playerId, buyInIndex) => {
      const updatedPlayers = players.map(p => {
        if (p.id === playerId) {
          const newBuyIns = p.buyInsCents.filter((_, idx) => idx !== buyInIndex);
          const newTotal = newBuyIns.reduce((sum, amt) => sum + amt, 0);
          return {
            ...p,
            buyInsCents: newBuyIns,
            totalBuyInCents: newTotal
          };
        }
        return p;
      });
      
      setPlayers(updatedPlayers);
      
      if (gameId) {
        try {
          await updateGame(gameId, { players: updatedPlayers });
        } catch (error) {
          console.error('Error deleting buy-in:', error);
        }
      }
    };    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          <div className="flex justify-between mb-6">
            <h2 className="text-3xl font-bold text-amber-400">GAME ON</h2>
            <div className="bg-black/40 px-4 py-2 rounded-lg border border-amber-500/30">
              <div className="text-xs text-amber-300">POT</div>
              <div className="text-2xl font-bold text-amber-400">${centsToDollars(totalPot)}</div>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            {players.map(player => (
              <div key={player.id} className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
                <div className="font-semibold text-white mb-1">{player.name}</div>
                <div className="text-sm text-amber-300 mb-2">Total: ${centsToDollars(player.totalBuyInCents)}</div>
                {player.buyInsCents.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {player.buyInsCents.map((amount, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-green-900/30 px-2 py-1 rounded">
                        <span className="text-amber-200/70">Buy-in {idx + 1}: ${centsToDollars(amount)}</span>
                        {currentPlayer?.isHost && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete this $${centsToDollars(amount)} buy-in?`)) {
                                deleteBuyIn(player.id, idx);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {currentPlayer?.isHost && (
                  <div>
                    <div className="flex gap-2 mb-2">
                      {quickAmounts.map(amt => (
                        <button key={amt} onClick={() => addBuyIn(player.id, amt)} className="bg-green-800/50 border border-amber-500/30 px-2 py-1 rounded text-xs text-amber-300">${amt}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="tel"
                        value={buyInInput} 
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty, numbers, and decimal point (max 2 decimal places)
                          if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                            setBuyInInput(value);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 bg-green-900/50 text-white px-3 py-2 rounded-lg border border-amber-500/20"
                        placeholder="0.00"
                      />
                      <button onClick={() => addBuyIn(player.id, buyInInput)} className="bg-red-600 px-4 py-2 rounded-lg border border-amber-500/30"><Plus size={18} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setScreen('settle')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mb-3 border-2 border-amber-500/50">END & SETTLE</button>
          <button onClick={resetApp} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg">Cancel</button>
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
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
        <div className="max-w-md mx-auto pt-8">
          <h2 className="text-3xl font-bold mb-6 text-amber-400">SETTLEMENT</h2>
          <div className="bg-black/40 rounded-xl p-6 mb-6 border-2 border-amber-500/30">
            <div className="text-sm text-amber-300 mb-4">RESULTS</div>
            {players.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-green-800/30 p-3 rounded-lg mb-2 border border-amber-500/20">
                <span className="font-semibold">{p.name}</span>
                <span className={`font-bold text-xl ${p.netResultCents > 0 ? 'text-emerald-300' : p.netResultCents < 0 ? 'text-red-400' : 'text-amber-300'}`}>
                  {p.netResultCents > 0 ? '+' : ''}${centsToDollars(p.netResultCents)}
                </span>
              </div>
            ))}
          </div>
          {settlements.length > 0 && (
            <div className="bg-black/40 rounded-xl p-6 mb-6 border-2 border-amber-500/30">
              <div className="text-sm text-amber-300 mb-4">PAYMENTS</div>
              {settlements.map((txn, i) => (
                <div key={i} className={`rounded-lg p-4 mb-3 border ${txn.paid ? 'bg-green-900/30 border-emerald-500/50' : 'bg-green-800/50 border-amber-500/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{txn.from}</span>
                      <ArrowRight size={16} className="text-amber-400" />
                      <span className="font-semibold">{txn.to}</span>
                    </div>
                    {txn.paid && <div className="text-xs bg-emerald-500 text-white px-2 py-1 rounded font-bold">PAID ✓</div>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-emerald-300">${centsToDollars(txn.amountCents)}</span>
                    <div className="flex gap-2">
                      {txn.toVenmo && !txn.paid && <a href={generateVenmoLink(txn.toVenmo, txn.amountCents)} className="bg-blue-600 px-4 py-2 rounded-lg text-sm font-bold border border-amber-500/30">Venmo</a>}
                      <button
                        onClick={async () => {
                          try {
                            const updated = await updatePaymentStatus(gameId, i, !txn.paid);
                            setSettlements(updated);
                          } catch (error) {
                            console.error('Error updating payment:', error);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border ${txn.paid ? 'bg-gray-600 border-gray-500' : 'bg-emerald-600 border-emerald-500'}`}
                      >
                        {txn.paid ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="bg-black/40 rounded-xl p-6 mb-6 border-2 border-amber-500/30">
            <label className="block text-sm text-amber-300 mb-2 font-semibold uppercase">Game Notes (Optional)</label>
            <textarea
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              placeholder="How was the game? Any memorable hands?"
              className="w-full bg-green-900/50 text-white px-4 py-3 rounded-lg border border-amber-500/20 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button onClick={resetApp} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl border-2 border-amber-500/50">DONE</button>
        </div>
      </div>
    );
  }

if (screen === 'history') {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        <h2 className="text-3xl font-bold mb-6 text-amber-400">HISTORY</h2>
        {gameHistory.length === 0 ? (
          <div className="text-center py-12 bg-black/40 rounded-xl border-2 border-amber-500/30"><History size={48} className="mx-auto mb-4 text-amber-400/50" /><p className="text-amber-200/70">No games yet</p></div>
        ) : (
          <div className="space-y-3 mb-6">
            {gameHistory.map((g, i) => (
              <div key={i} className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
                <div className="flex justify-between mb-2">
                  <div>
                    <div className="font-semibold">{new Date(g.date).toLocaleDateString()}</div>
                    {g.sessionName && <div className="text-sm text-amber-400 italic">"{g.sessionName}"</div>}
                    <div className="text-sm text-amber-300">{g.players.length} players</div>
                  </div>
                  {g.myResult && <div className={`text-xl font-bold ${parseFloat(g.myResult) > 0 ? 'text-emerald-300' : 'text-red-400'}`}>{parseFloat(g.myResult) > 0 ? '+' : ''}${g.myResult}</div>}
                </div>
                <div className="text-xs text-amber-500/60 font-mono">Code: {g.code}</div>
                {g.notes && <div className="text-sm text-amber-200/80 mt-2 italic">"{g.notes}"</div>}
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setScreen('home')} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg">Back</button>
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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        <h2 className="text-3xl font-bold mb-6 text-amber-400">YOUR STATS</h2>
        {myGames.length === 0 ? (
          <div className="text-center py-12 bg-black/40 rounded-xl border-2 border-amber-500/30"><TrendingUp size={48} className="mx-auto mb-4 text-amber-400/50" /><p className="text-amber-200/70">Play to see stats!</p></div>
        ) : (
          <>
            <div className="bg-black/40 rounded-xl p-6 mb-6 border-2 border-amber-500/30">
              <div className="text-center mb-6">
                <div className="text-sm text-amber-300 mb-1">NET PROFIT/LOSS</div>
                <div className={`text-5xl font-bold ${parseFloat(stats.totalResult) > 0 ? 'text-emerald-300' : parseFloat(stats.totalResult) < 0 ? 'text-red-400' : 'text-amber-300'}`}>
                  {parseFloat(stats.totalResult) > 0 ? '+' : ''}${stats.totalResult}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-800/50 rounded-lg p-3 border border-amber-500/20">
                  <div className="text-2xl font-bold text-amber-400">{stats.totalGames}</div>
                  <div className="text-xs text-amber-200/70">GAMES</div>
                </div>
                <div className="bg-green-800/50 rounded-lg p-3 border border-amber-500/20">
                  <div className="text-2xl font-bold text-emerald-300">{wins.length}</div>
                  <div className="text-xs text-amber-200/70">WINS</div>
                </div>
                <div className="bg-green-800/50 rounded-lg p-3 border border-amber-500/20">
                  <div className="text-2xl font-bold text-red-400">{losses.length}</div>
                  <div className="text-xs text-amber-200/70">LOSSES</div>
                </div>
              </div>
            </div>
            <div className="bg-black/40 rounded-xl p-6 mb-6 border-2 border-amber-500/30">
              <div className="space-y-3">
                <div className="flex justify-between bg-green-800/30 p-3 rounded-lg border border-amber-500/20">
                  <span className="text-amber-300">Win Rate</span>
                  <span className="font-bold text-amber-400">{stats.winRate}%</span>
                </div>
                <div className="flex justify-between bg-green-800/30 p-3 rounded-lg border border-amber-500/20">
                  <span className="text-amber-300">Biggest Win</span>
                  <span className="font-bold text-emerald-300">+${wins.length > 0 ? Math.max(...wins.map(g => parseFloat(g.myResult))).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between bg-green-800/30 p-3 rounded-lg border border-amber-500/20">
                  <span className="text-amber-300">Biggest Loss</span>
                  <span className="font-bold text-red-400">${losses.length > 0 ? Math.min(...losses.map(g => parseFloat(g.myResult))).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between bg-green-800/30 p-3 rounded-lg border border-amber-500/20">
                  <span className="text-amber-300">Average</span>
                  <span className={`font-bold ${parseFloat(stats.totalResult) / stats.totalGames > 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                    {(parseFloat(stats.totalResult) / stats.totalGames > 0 ? '+' : '')}${(parseFloat(stats.totalResult) / stats.totalGames).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
        <button onClick={() => setScreen('home')} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg">Back</button>
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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        <h2 className="text-3xl font-bold mb-6 text-amber-400">SAVED GROUPS</h2>
        {savedGroups.length === 0 ? (
          <div className="text-center py-12 bg-black/40 rounded-xl border-2 border-amber-500/30">
            <Users size={48} className="mx-auto mb-4 text-amber-400/50" />
            <p className="text-amber-200/70">No saved groups yet</p>
            <p className="text-sm text-amber-300/50 mt-2">Create a game and save your player group!</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {savedGroups.map(group => (
              <div key={group.id} className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-lg text-amber-400">{group.name}</div>
                    <div className="text-sm text-amber-300">{group.players.length} players: {group.players.map(p => p.name).join(', ')}</div>
                  </div>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="text-red-400 hover:text-red-300 text-xl"
                  >
                    ✕
                  </button>
                </div>
                <button
                  onClick={async () => {
                    loadGroup(group);
                    try {
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
                      
                      const gameData = {
                        hostId: loadedPlayers[0].id,
                        hostName: loadedPlayers[0].name,
                        sessionName: null,
                        players: loadedPlayers,
                        status: 'lobby'
                      };
                      
                      const { gameId: newGameId, code } = await createGame(gameData);
                      
                      setGameId(newGameId);
                      setGameCode(code);
                      setCurrentPlayer(loadedPlayers[0]);
                      setPlayers(loadedPlayers);
                      setScreen('lobby');
                      
                      const unsub = subscribeToGame(newGameId, (gameData) => {
                        setPlayers(gameData.players || []);
                      });
                      setUnsubscribe(() => unsub);
                    } catch (error) {
                      console.error('Error creating game:', error);
                      alert('Failed to create game');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-2 rounded-lg mt-2"
                >
                  Start Game with this Group
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setScreen('home')} className="w-full bg-black/40 text-amber-300 border border-amber-500/30 py-3 rounded-lg">Back</button>
      </div>
    </div>
  );
}

return null;
};

export default PokerSettleApp;