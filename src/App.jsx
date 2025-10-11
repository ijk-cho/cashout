import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './Auth';
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
  const [gameHistory, setGameHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [user, setUser] = useState(undefined); // undefined = loading, null = guest, object = signed in
  const [showAuth, setShowAuth] = useState(false);
  const quickAmounts = [5, 10, 20, 50, 100];

  useEffect(() => {
    const saved = localStorage.getItem('pokerGameHistory');
    if (saved) {
      setGameHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setShowAuth(false);
      } else {
        setUser(undefined); // Show auth screen
        setShowAuth(true);
      }
    });
    
    return () => unsubscribe();
  }, []);

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

  const saveToHistory = (game) => {
    if (!user) {
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
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my poker game!',
        text: `Join my poker game with code: ${gameCode}`,
      });
    } else {
      copyCode();
    }
  };

  const generateVenmoLink = (username, amountCents) => {
    const cleanUsername = username?.replace('@', '') || '';
    const amount = centsToDollars(amountCents);
    return `venmo://paycharge?txn=pay&recipients=${cleanUsername}&amount=${amount}&note=Poker%20game%20settlement`;
  };

// Show loading while checking auth
  if (user === undefined && showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white flex items-center justify-center">
        <div className="text-2xl font-bold text-amber-400">Loading...</div>
      </div>
    );
  }

  // Show auth screen if not signed in
  if (showAuth && user === undefined) {
    return <Auth onAuthSuccess={(firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null); // Guest mode
      }
      setShowAuth(false);
    }} />;
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
        {user && user.email && (
          <div className="text-right mb-4">
            <button
              onClick={() => {
                if (window.confirm('Sign out?')) {
                  auth.signOut();
                  setUser(undefined);
                  setGameHistory([]);
                  setSavedGroups([]);
                  setShowAuth(true);
                }
              }}
              className="bg-black/40 backdrop-blur-sm text-amber-300 border border-amber-500/30 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black/60"
            >
              Sign Out ({user.email})
            </button>
          </div>
        )}
        {user === null && (
          <div className="bg-amber-500/20 border border-amber-500 rounded-lg p-3 mb-4 text-center">
            <p className="text-amber-200 text-sm font-semibold">⚠️ Guest Mode - History not saved</p>
            <button
              onClick={() => setShowAuth(true)}
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
          <div className="bg-black/40 rounded-xl p-6 mb-6 border-2 border-amber-500/30">
            <div className="text-center mb-4">
              <div className="text-sm text-amber-300 mb-2">GAME CODE</div>
              <div className="text-5xl font-mono font-bold bg-green-900/50 py-4 rounded-lg mb-3">{gameCode}</div>
              <div className="flex gap-2">
                <button onClick={copyCode} className="flex-1 bg-green-800/50 border border-amber-500/30 py-2 rounded-lg text-amber-300">
                  {copied ? <Check size={18} className="inline" /> : <Copy size={18} className="inline" />} {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={shareCode} className="flex-1 bg-red-600 py-2 rounded-lg border border-amber-500/30"><Share2 size={18} className="inline" /> Share</button>
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
                      <input type="number" step="0.01" value={buyInInput} onChange={(e) => setBuyInInput(e.target.value)} className="flex-1 bg-green-900/50 text-white px-3 py-2 rounded-lg border border-amber-500/20" />
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
            {players.map(p => (
              <div key={p.id} className="bg-black/40 rounded-xl p-4 border-2 border-amber-500/30">
                <div className="font-semibold text-white mb-1">{p.name}</div>
                <div className="text-sm text-amber-300 mb-2">Bought: ${centsToDollars(p.totalBuyInCents)}</div>
                <input type="number" step="0.01" value={p.finalChipsCents ? centsToDollars(p.finalChipsCents) : ''} onChange={(e) => {
                  setPlayers(players.map(pl => pl.id === p.id ? {...pl, finalChipsCents: dollarsToCents(e.target.value)} : pl));
                }} className="w-full bg-green-900/50 text-white px-3 py-2 rounded-lg border border-amber-500/20" placeholder="Final $" />
              </div>
            ))}
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