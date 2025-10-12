const styles = `
  .poker-table-bg {
    background: radial-gradient(ellipse at center, #1a4d2e 0%, #0d2818 70%, #050f0a 100%);
    position: relative;
  }
  
  .poker-table-bg::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%);
    pointer-events: none;
  }
  
  .felt-texture {
    background-image: 
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 2px,
        rgba(255,255,255,0.01) 2px,
        rgba(255,255,255,0.01) 4px
      );
  }

  .table-rail {
    background: linear-gradient(135deg, #2d1810 0%, #1a0f08 100%);
    box-shadow: 
      inset 0 2px 4px rgba(0,0,0,0.5),
      inset 0 -2px 4px rgba(255,255,255,0.05);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

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
    <div className="min-h-screen poker-table-bg felt-texture text-white p-6 relative overflow-hidden">
      {/* Poker Table Rail - Top */}
      <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>

      {/* Decorative suit - Bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-6xl opacity-20 text-amber-200">♠</div>

      {/* Poker Table Rail - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
      
      <div className="max-w-md mx-auto relative z-10">

      {/* Top Right Buttons */}
      <div className="absolute top-6 right-6 z-30 flex gap-3 items-center">
        {showInstallButton && (
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
            className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center font-bold text-white border-2 border-amber-500/50 hover:from-amber-700 hover:to-amber-800 transition shadow-lg"
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
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 bg-gradient-to-br from-red-600 to-red-700 shadow-2xl border-4 border-amber-500/40">
            <DollarSign size={48} className="text-amber-100" strokeWidth={3} />
          </div>
          <h1 className="text-6xl font-bold mb-2 tracking-tight text-amber-100" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>
            CASHOUT
          </h1>
          <p className="text-emerald-200/80 text-sm font-semibold tracking-wide">Settle your poker games</p>
        </div>

        {stats.totalGames > 0 && (
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-100 mb-1">{stats.totalGames}</div>
                <div className="text-xs text-emerald-300/70 uppercase tracking-wide font-semibold">Games</div>
              </div>
              <div className="text-center border-x border-amber-600/20">
                <div className={`text-3xl font-bold mb-1 ${parseFloat(stats.totalResult) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(stats.totalResult) >= 0 ? '+' : ''}${stats.totalResult}
                </div>
                <div className="text-xs text-emerald-300/70 uppercase tracking-wide font-semibold">Total</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-100 mb-1">{stats.wins}-{stats.losses}</div>
                <div className="text-xs text-emerald-300/70 uppercase tracking-wide font-semibold">W-L</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button onClick={() => setScreen('create')} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-5 rounded-2xl transition shadow-2xl border-2 border-amber-500/50 flex items-center justify-center gap-2">
            <Plus size={20} />
            Host New Game
          </button>
          <button onClick={() => setScreen('join')} className="w-full bg-black/40 backdrop-blur-sm hover:bg-black/50 text-amber-100 font-bold py-5 rounded-2xl transition border-2 border-amber-600/30 shadow-xl flex items-center justify-center gap-2">
            <Users size={20} />
            Join Game
          </button>
        </div>

        {savedGroups.length > 0 && (
          <button
            onClick={() => { setScreen('groups'); }}
            className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 py-4 rounded-2xl transition border border-amber-600/20 shadow-lg flex items-center justify-center gap-2 mb-4"
          >
            <Users size={20} />
            <span className="font-semibold">Load Saved Group</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setScreen('history')} className="bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 py-4 rounded-2xl transition border border-amber-600/20 flex items-center justify-center gap-2 shadow-lg">
            <History size={20} />
            <span className="font-semibold">History</span>
          </button>
          <button onClick={() => setScreen('stats')} className="bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 py-4 rounded-2xl transition border border-amber-600/20 flex items-center justify-center gap-2 shadow-lg">
            <TrendingUp size={20} />
            <span className="font-semibold">Stats</span>
          </button>
        </div>

      </div>
    </div>
  );
  }

  if (screen === 'host') {
    return (
      <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
        {/* Poker Table Rail - Top */}
        <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
        
        <div className="max-w-md mx-auto pt-16 relative z-10">
          <h2 className="text-4xl font-bold mb-8 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>HOST GAME</h2>
          
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <label className="block text-sm text-emerald-300/90 mb-2 font-semibold uppercase tracking-wide">Session Name (Optional)</label>
            <input 
              type="text" 
              value={sessionName} 
              onChange={(e) => setSessionName(e.target.value)} 
              placeholder="e.g., Sunday Runs with the Boys" 
              className="w-full bg-black/30 text-white px-4 py-3 rounded-2xl mb-4 border border-amber-600/20 focus:border-amber-500/50 focus:outline-none transition placeholder:text-gray-500" 
            />
            <label className="block text-sm text-emerald-300/90 mb-2 font-semibold uppercase tracking-wide">Your Name</label>
            <input 
              type="text" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)} 
              placeholder="Enter your name" 
              className="w-full bg-black/30 text-white px-4 py-3 rounded-2xl border border-amber-600/20 focus:border-amber-500/50 focus:outline-none transition placeholder:text-gray-500" 
            />
          </div>
          
          <button 
            onClick={createGameHandler} 
            disabled={!playerName.trim()} 
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-5 rounded-2xl mb-3 border-2 border-amber-500/50 shadow-2xl transition"
          >
            CREATE GAME
          </button>
          <button 
            onClick={resetApp} 
            className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
          >
            Back
          </button>
        </div>
        
        {/* Poker Table Rail - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
      </div>
    );
  }

  if (screen === 'join') {
    return (
      <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
        {/* Poker Table Rail - Top */}
        <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
        
        <div className="max-w-md mx-auto pt-16 relative z-10">
          <h2 className="text-4xl font-bold mb-8 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>JOIN GAME</h2>
          
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <label className="block text-sm text-emerald-300/90 mb-2 font-semibold uppercase tracking-wide">Game Code</label>
            <input 
              type="text" 
              value={inputCode} 
              onChange={(e) => setInputCode(e.target.value.toUpperCase())} 
              maxLength={6} 
              className="w-full bg-black/30 text-amber-100 px-4 py-4 rounded-2xl mb-4 text-center text-3xl font-mono tracking-widest border border-amber-600/20 focus:border-amber-500/50 focus:outline-none transition placeholder:text-gray-500" 
              placeholder="ABC123"
            />
            <label className="block text-sm text-emerald-300/90 mb-2 font-semibold uppercase tracking-wide">Your Name</label>
            <input 
              type="text" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)} 
              className="w-full bg-black/30 text-white px-4 py-3 rounded-2xl border border-amber-600/20 focus:border-amber-500/50 focus:outline-none transition placeholder:text-gray-500" 
              placeholder="Enter your name"
            />
          </div>
          
          <button 
            onClick={async () => {
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
            }} 
            disabled={!playerName.trim() || inputCode.length !== 6} 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-5 rounded-2xl mb-3 border-2 border-amber-500/50 shadow-2xl transition"
          >
            JOIN GAME
          </button>
          <button 
            onClick={resetApp} 
            className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
          >
            Back
          </button>
        </div>
        
        {/* Poker Table Rail - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
        {/* Poker Table Rail - Top */}
        <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
        
        <div className="max-w-md mx-auto pt-16 relative z-10">
          <h2 className="text-4xl font-bold mb-2 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>LOBBY</h2>
          {sessionName && <p className="text-emerald-200/80 mb-6 text-center text-lg italic">"{sessionName}"</p>}
          {!sessionName && <div className="mb-6"></div>}
          
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-sm text-emerald-300/90 mb-2 font-semibold uppercase tracking-wide">Game Code</div>
              <div className="text-5xl font-bold tracking-widest text-amber-100 mb-4">{gameCode}</div>
              
              {/* Share Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={shareCode}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 border border-amber-500/30 shadow-lg transition"
                >
                  <Share2 size={18} />
                  Share Link
                </button>
                <button 
                  onClick={copyCode}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 border border-amber-500/30 shadow-lg transition"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              
              {/* Show the actual URL that will be shared */}
              <div className="mt-3 text-xs text-emerald-300/50 font-mono break-all">
                {window.location.origin}{window.location.pathname}?code={gameCode}
              </div>
            </div>
          </div>
          
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <div className="text-sm text-emerald-300/90 mb-4 font-semibold uppercase tracking-wide">Players ({players.length})</div>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-black/30 p-3 rounded-2xl border border-amber-600/20">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center font-bold text-white shadow-lg">{p.name[0].toUpperCase()}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{p.name}</div>
                    {p.isHost && <div className="text-xs text-amber-400 font-semibold">HOST</div>}
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
                      className="bg-red-500/30 hover:bg-red-500/50 px-3 py-1 rounded-lg text-xs font-semibold border border-red-400/30 text-red-300 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {currentPlayer?.isHost && players.length >= 2 && !showGroupSelector && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-amber-600/20">
              <div className="text-xs text-emerald-300/90 mb-2 uppercase tracking-wide font-semibold">Save as Group</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name (e.g., Friday Night Crew)"
                  className="flex-1 bg-black/30 text-white px-3 py-2 rounded-xl text-sm border border-amber-600/20 focus:border-amber-500/50 focus:outline-none transition placeholder:text-gray-500"
                />
                <button
                  onClick={saveGroup}
                  className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg"
                >
                  Save
                </button>
              </div>
            </div>
          )}
          
          {currentPlayer?.isHost && (
            <button 
              onClick={async () => { 
                if (players.length < 2) { alert('Need 2+ players'); return; }
                if (gameId) {
                  await updateGame(gameId, { status: 'active' });
                }
                setScreen('game');
              }} 
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-5 rounded-2xl mb-3 border-2 border-amber-500/50 shadow-2xl transition"
            >
              START GAME
            </button>
          )}
          <button 
            onClick={resetApp} 
            className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
          >
            Leave Game
          </button>
        </div>
        
        {/* Poker Table Rail - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
      </div>
    );
  }

  if (screen === 'game') {
    return (
      <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
        {/* Poker Table Rail - Top */}
        <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
        
        <div className="max-w-md mx-auto pt-16 relative z-10">
          <h2 className="text-4xl font-bold mb-2 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>GAME ON</h2>
          {sessionName && <p className="text-emerald-200/80 mb-6 text-center text-lg italic">"{sessionName}"</p>}
          {!sessionName && <div className="mb-6"></div>}
          
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <div className="text-sm text-emerald-300/90 mb-4 font-semibold uppercase tracking-wide">Players & Buy-ins</div>
            <div className="space-y-3">
              {players.map(player => (
                <div key={player.id} className="bg-black/30 rounded-2xl p-4 border border-amber-600/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg">
                        {player.name[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-white">{player.name}</span>
                    </div>
                    <div className="text-amber-100 font-bold text-lg">
                      ${centsToDollars(player.totalBuyInCents)}
                    </div>
                  </div>
                  {player.buyInsCents.length > 0 && (
                    <div className="text-xs text-emerald-300/60 mb-2 flex flex-wrap gap-1">
                      {player.buyInsCents.map((b, idx) => (
                        <span key={idx} className="bg-black/30 px-2 py-0.5 rounded-lg">${centsToDollars(b)}</span>
                      ))}
                    </div>
                  )}
                  {currentPlayer?.isHost && (
                    <div className="flex gap-2 mt-3">
                      <input 
                        type="text"
                        inputMode="decimal"
                        value={buyInInput} 
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                            setBuyInInput(value);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 bg-black/30 text-white px-3 py-2 rounded-xl border border-amber-600/20 focus:border-amber-500/50 focus:outline-none transition placeholder:text-gray-500"
                        placeholder="0.00"
                      />
                      <button 
                        onClick={() => addBuyIn(player.id, buyInInput)} 
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-4 py-2 rounded-xl border border-amber-500/30 shadow-lg transition"
                      >
                        <Plus size={18} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={() => setScreen('settle')} 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-5 rounded-2xl mb-3 border-2 border-amber-500/50 shadow-2xl transition"
          >
            END & SETTLE
          </button>
          <button 
            onClick={resetApp} 
            className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
          >
            Cancel Game
          </button>
        </div>
        
        {/* Poker Table Rail - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
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
        notes: gameNotes || null
      });
      
      if (gameId) {
        await updateGame(gameId, { 
          status: 'completed',
          players: updatedPlayers,
          settlements: transactions
        });
      }
      
      setScreen('settlement');
    };
    
    return (
      <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
        {/* Poker Table Rail - Top */}
        <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
        
        <div className="max-w-md mx-auto pt-16 relative z-10">
          <h2 className="text-4xl font-bold mb-8 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>FINAL COUNTS</h2>
          
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-sm text-emerald-300/70 uppercase tracking-wide font-semibold mb-1">Total Pot</div>
                <div className="text-2xl font-bold text-amber-100">${centsToDollars(totalPot)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-emerald-300/70 uppercase tracking-wide font-semibold mb-1">Total Chips</div>
                <div className={`text-2xl font-bold ${balanced ? 'text-green-400' : 'text-red-400'}`}>
                  ${centsToDollars(totalChips)}
                </div>
              </div>
            </div>
            {!balanced && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-3 text-center">
                <p className="text-red-300 text-sm font-semibold">⚠️ Difference: ${centsToDollars(Math.abs(totalPot - totalChips))}</p>
              </div>
            )}
          </div>

          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <div className="text-sm text-emerald-300/90 mb-4 font-semibold uppercase tracking-wide">Enter Final Chip Counts</div>
            <div className="space-y-3">
              {players.map((player, index) => {
                const isLastPlayer = index === players.length - 1;
                const otherPlayersHaveChips = players.slice(0, -1).every(p => p.finalChipsCents !== null);
                
                if (isLastPlayer && otherPlayersHaveChips) {
                  const otherChipsTotal = players.slice(0, -1).reduce((sum, p) => sum + (p.finalChipsCents || 0), 0);
                  const autoChips = totalPot - otherChipsTotal;
                  
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
                  <div key={player.id} className="bg-black/30 rounded-2xl p-4 border border-amber-600/20">
                    <div className="font-semibold mb-2 text-white">{player.name}</div>
                    <div className="text-sm text-emerald-300/70 mb-3">Buy-in: ${centsToDollars(player.totalBuyInCents)}</div>
                    <label className="block text-sm text-emerald-300/90 mb-2 font-semibold uppercase tracking-wide">Final Chips ($)</label>
                    {isLastPlayer && otherPlayersHaveChips ? (
                      <div className="w-full bg-blue-900/30 text-white px-4 py-3 rounded-2xl border-2 border-blue-500/50 font-bold text-lg flex items-center justify-between">
                        <span>${centsToDollars(player.finalChipsCents || 0)}</span>
                        <span className="text-xs text-blue-300 font-semibold">AUTO</span>
                      </div>
                    ) : (
                      <input
                        type="tel"
                        value={player.inputValue !== undefined ? player.inputValue : (player.finalChipsCents !== null ? centsToDollars(player.finalChipsCents) : '')}
                        onChange={(e) => {
                          const value = e.target.value;
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
                          const value = e.target.value;
                          if (value && !value.includes('.')) {
                            const updatedPlayers = players.map(p =>
                              p.id === player.id ? { ...p, inputValue: undefined } : p
                            );
                            setPlayers(updatedPlayers);
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/30 text-white px-4 py-3 rounded-2xl border border-amber-600/20 focus:border-amber-500/50 focus:outline-none transition placeholder:text-gray-500"
                        placeholder="0.00"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-amber-600/20">
            <label className="block text-sm text-emerald-300/90 mb-2 font-semibold uppercase tracking-wide">Notes (Optional)</label>
            <textarea
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              placeholder="Add notes about this game..."
              className="w-full bg-black/30 text-white px-4 py-3 rounded-2xl border border-amber-600/20 focus:border-amber-500/50 focus:outline-none transition placeholder:text-gray-500 resize-none"
              rows={3}
            />
          </div>

          <button 
            onClick={calculateSettlement} 
            disabled={!balanced || players.some(p => p.finalChipsCents === null)}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-5 rounded-2xl mb-3 border-2 border-amber-500/50 shadow-2xl transition"
          >
            CALCULATE SETTLEMENT
          </button>
          <button 
            onClick={() => setScreen('game')} 
            className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
          >
            Back to Game
          </button>
        </div>
        
        {/* Poker Table Rail - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
      </div>
    );
  }

  if (screen === 'settlement') {
    return (
      <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
        <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
        
        <div className="max-w-md mx-auto pt-16 relative z-10">
          <h2 className="text-4xl font-bold mb-8 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>SETTLEMENT</h2>
          
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
            <div className="text-sm text-emerald-300/90 mb-4 font-semibold uppercase tracking-wide">Results</div>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-black/30 p-3 rounded-2xl border border-amber-600/20">
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className={`font-bold text-xl ${p.netResultCents > 0 ? 'text-green-400' : p.netResultCents < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {p.netResultCents > 0 ? '+' : ''}${centsToDollars(p.netResultCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {settlements.length > 0 && (
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
              <div className="text-sm text-emerald-300/90 mb-4 font-semibold uppercase tracking-wide">Payments</div>
              <div className="space-y-3">
                {settlements.map((txn, i) => (
                  <div key={i} className={`rounded-2xl p-4 border ${txn.paid ? 'bg-green-900/30 border-green-500/50' : 'bg-black/30 border-amber-600/20'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{txn.from}</span>
                        <ArrowRight size={16} className="text-amber-400" />
                        <span className="font-semibold text-white">{txn.to}</span>
                      </div>
                      {txn.paid && <div className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-bold">PAID ✓</div>}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-green-400">${centsToDollars(txn.amountCents)}</span>
                      <div className="flex gap-2">
                        {txn.toVenmo && !txn.paid && (
                          <a 
                            href={generateVenmoLink(txn.toVenmo, txn.amountCents)} 
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 rounded-xl text-sm font-bold border border-amber-500/30 shadow-lg transition"
                          >
                            Venmo
                          </a>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              const updated = await updatePaymentStatus(gameId, i, !txn.paid);
                              setSettlements(updated);
                            } catch (error) {
                              console.error('Error updating payment:', error);
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border transition shadow-lg ${txn.paid ? 'bg-gray-600 hover:bg-gray-700 border-gray-500' : 'bg-green-600 hover:bg-green-700 border-green-500'}`}
                        >
                          {txn.paid ? 'Mark Unpaid' : 'Mark Paid'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-amber-600/20">
            <label className="block text-sm text-emerald-300/90 mb-2 font-semibold uppercase tracking-wide">Game Notes (Optional)</label>
            <textarea
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              placeholder="How was the game? Any memorable hands?"
              className="w-full bg-black/30 text-white px-4 py-3 rounded-2xl border border-amber-600/20 min-h-[100px] resize-none focus:outline-none focus:border-amber-500/50 transition placeholder:text-gray-500"
            />
          </div>
          
          <button 
            onClick={resetApp} 
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-5 rounded-2xl border-2 border-amber-500/50 shadow-2xl transition"
          >
            DONE
          </button>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
      </div>
    );
  }

if (screen === 'history') {
  return (
    <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
      <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
      
      <div className="max-w-md mx-auto pt-16 relative z-10">
        <h2 className="text-4xl font-bold mb-8 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>HISTORY</h2>
        
        {gameHistory.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-12 text-center border-2 border-amber-600/30 shadow-2xl">
            <History size={48} className="mx-auto mb-4 text-amber-400/50" />
            <p className="text-emerald-200/70">No games played yet!</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {gameHistory.slice().reverse().map((g, idx) => (
              <div key={idx} className="bg-black/40 backdrop-blur-xl rounded-3xl p-5 border-2 border-amber-600/30 shadow-2xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm text-emerald-300/70">{new Date(g.date).toLocaleDateString()}</div>
                    {g.sessionName && <div className="font-semibold text-amber-100 mt-1">{g.sessionName}</div>}
                  </div>
                  {g.myResult && (
                    <div className={`text-2xl font-bold ${parseFloat(g.myResult) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {parseFloat(g.myResult) > 0 ? '+' : ''}${g.myResult}
                    </div>
                  )}
                </div>
                <div className="space-y-1 mb-3">
                  {g.players.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm bg-black/30 px-3 py-2 rounded-xl border border-amber-600/20">
                      <span className="text-white">{p.name}</span>
                      <span className={`font-semibold ${parseFloat(p.result) > 0 ? 'text-green-400' : parseFloat(p.result) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {parseFloat(p.result) > 0 ? '+' : ''}${p.result}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-amber-500/60 font-mono">Code: {g.code}</div>
                {g.notes && <div className="text-sm text-emerald-200/80 mt-2 italic">"{g.notes}"</div>}
              </div>
            ))}
          </div>
        )}
        
        <button 
          onClick={() => setScreen('home')} 
          className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
        >
          Back
        </button>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
    </div>
  );
}

if (screen === 'stats') {
  const stats = calculateStats();
  const myGames = gameHistory.filter(g => g.myResult !== null);
  const wins = myGames.filter(g => parseFloat(g.myResult) > 0);
  const losses = myGames.filter(g => parseFloat(g.myResult) < 0);
  
  return (
    <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
      <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
      
      <div className="max-w-md mx-auto pt-16 relative z-10">
        <h2 className="text-4xl font-bold mb-8 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>YOUR STATS</h2>
        
        {myGames.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-12 text-center border-2 border-amber-600/30 shadow-2xl">
            <TrendingUp size={48} className="mx-auto mb-4 text-amber-400/50" />
            <p className="text-emerald-200/70">Play some games to see stats!</p>
          </div>
        ) : (
          <>
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-sm text-emerald-300/90 mb-1 uppercase tracking-wide font-semibold">Net Profit/Loss</div>
                <div className={`text-5xl font-bold ${parseFloat(stats.totalResult) > 0 ? 'text-green-400' : parseFloat(stats.totalResult) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {parseFloat(stats.totalResult) > 0 ? '+' : ''}${stats.totalResult}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-black/30 rounded-2xl p-4 border border-amber-600/20">
                  <div className="text-3xl font-bold text-amber-100 mb-1">{stats.totalGames}</div>
                  <div className="text-xs text-emerald-300/70 uppercase tracking-wide font-semibold">Games</div>
                </div>
                <div className="text-center bg-black/30 rounded-2xl p-4 border border-amber-600/20">
                  <div className="text-3xl font-bold text-green-400 mb-1">{stats.wins}</div>
                  <div className="text-xs text-emerald-300/70 uppercase tracking-wide font-semibold">Wins</div>
                </div>
                <div className="text-center bg-black/30 rounded-2xl p-4 border border-amber-600/20">
                  <div className="text-3xl font-bold text-red-400 mb-1">{stats.losses}</div>
                  <div className="text-xs text-emerald-300/70 uppercase tracking-wide font-semibold">Losses</div>
                </div>
              </div>
            </div>

            {stats.biggestWin && (
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-green-600/30 shadow-2xl">
                <div className="text-sm text-emerald-300/90 mb-2 uppercase tracking-wide font-semibold">Biggest Win</div>
                <div className="text-3xl font-bold text-green-400">+${stats.biggestWin}</div>
              </div>
            )}

            {stats.biggestLoss && (
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-red-600/30 shadow-2xl">
                <div className="text-sm text-emerald-300/90 mb-2 uppercase tracking-wide font-semibold">Biggest Loss</div>
                <div className="text-3xl font-bold text-red-400">-${stats.biggestLoss}</div>
              </div>
            )}

            <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
              <div className="text-sm text-emerald-300/90 mb-4 uppercase tracking-wide font-semibold">Performance</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white">Win Rate</span>
                  <span className="font-bold text-amber-100">{stats.winRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white">Avg Win</span>
                  <span className="font-bold text-green-400">+${stats.avgWin}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white">Avg Loss</span>
                  <span className="font-bold text-red-400">-${stats.avgLoss}</span>
                </div>
              </div>
            </div>
          </>
        )}
        
        <button 
          onClick={() => setScreen('home')} 
          className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
        >
          Back
        </button>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
    </div>
  );
}

if (screen === 'settings') {
  return (
    <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
      <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
      
      <div className="max-w-md mx-auto pt-16 relative z-10">
        <h2 className="text-4xl font-bold mb-8 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>SETTINGS</h2>
        
        <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
          <div className="text-sm text-emerald-300/90 mb-4 uppercase tracking-wide font-semibold">Account</div>
          
          {user && user !== 'guest' && user.email && (
            <div className="space-y-4">
              <div className="bg-black/30 rounded-2xl p-4 border border-amber-600/20">
                <div className="text-xs text-emerald-300/70 uppercase tracking-wide mb-1">Email</div>
                <div className="text-white font-semibold">{user.email}</div>
              </div>
              
              <div className="bg-black/30 rounded-2xl p-4 border border-amber-600/20">
                <div className="text-xs text-emerald-300/70 uppercase tracking-wide mb-1">Display Name</div>
                <div className="text-white font-semibold">{user.displayName || 'Not set'}</div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
          <div className="text-sm text-emerald-300/90 mb-4 uppercase tracking-wide font-semibold">Data</div>
          
          <button
            onClick={() => {
              if (window.confirm('Clear all game history? This cannot be undone.')) {
                setGameHistory([]);
                localStorage.removeItem('pokerGameHistory');
                alert('History cleared!');
              }
            }}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 py-3 rounded-2xl font-semibold transition"
          >
            Clear Game History
          </button>
        </div>

        <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 mb-6 border-2 border-amber-600/30 shadow-2xl">
          <div className="text-sm text-emerald-300/90 mb-4 uppercase tracking-wide font-semibold">About</div>
          <div className="space-y-2 text-sm text-emerald-200/80">
            <div>Version 1.0.0</div>
            <div>CASHOUT - Poker Settlement App</div>
          </div>
        </div>

        <button 
          onClick={() => setScreen('home')} 
          className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
        >
          Back
        </button>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
    </div>
  );
}

if (screen === 'groups') {
  return (
    <div className="min-h-screen poker-table-bg felt-texture text-white p-6">
      <div className="absolute top-0 left-0 right-0 h-8 table-rail"></div>
      
      <div className="max-w-md mx-auto pt-16 relative z-10">
        <h2 className="text-4xl font-bold mb-8 text-amber-100 text-center" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.5)'}}>SAVED GROUPS</h2>
        
        {savedGroups.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-12 text-center border-2 border-amber-600/30 shadow-2xl">
            <Users size={48} className="mx-auto mb-4 text-amber-400/50" />
            <p className="text-emerald-200/70">No saved groups yet!</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {savedGroups.map(group => (
              <div key={group.id} className="bg-black/40 backdrop-blur-xl rounded-3xl p-5 border-2 border-amber-600/30 shadow-2xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-xl text-amber-100 mb-1">{group.name}</div>
                    <div className="text-sm text-emerald-300/70">{group.players.length} players</div>
                  </div>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-semibold transition"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="space-y-1 mb-3">
                  {group.players.map((p, i) => (
                    <div key={i} className="text-sm bg-black/30 px-3 py-2 rounded-xl border border-amber-600/20 text-white">
                      {p.name}
                    </div>
                  ))}
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
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 rounded-2xl border-2 border-amber-500/50 shadow-2xl transition"
                >
                  Start Game with this Group
                </button>
              </div>
            ))}
          </div>
        )}
        
        <button 
          onClick={() => setScreen('home')} 
          className="w-full bg-black/30 backdrop-blur-sm hover:bg-black/40 text-amber-200 border border-amber-600/20 py-4 rounded-2xl font-semibold transition"
        >
          Back
        </button>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-8 table-rail"></div>
    </div>
  );
}

return null;
};

export default PokerSettleApp;