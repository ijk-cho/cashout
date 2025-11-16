import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { createGame, getGameByCode, updateGame, subscribeToGame } from '../gameService';
import {
  sendGameInvite,
  subscribeToFriends,
  subscribeToGameInvites
} from '../friendService';
import { soundManager } from '../sounds';

const GameContext = createContext(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

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

export const GameProvider = ({ children }) => {
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
  const [newGroupName, setNewGroupName] = useState('');
  const [gameHistory, setGameHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [user, setUser] = useState(undefined);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Friends state
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [inviteSelectedFriends, setInviteSelectedFriends] = useState([]);
  const [gameInvites, setGameInvites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('pokerGameHistory');
    if (saved) {
      setGameHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);
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

  // Subscribe to friends updates
  useEffect(() => {
    if (user && user !== 'guest' && user.uid) {
      const unsubscribeFriends = subscribeToFriends(({ friends: f, pending: p, sent: s }) => {
        setFriends(f);
        setPendingRequests(p);
        setSentRequests(s);
      });

      return () => {
        if (unsubscribeFriends) unsubscribeFriends();
      };
    }
  }, [user]);

  // Subscribe to game invites
  useEffect(() => {
    if (user && user !== 'guest' && user.uid) {
      const unsubscribeInvites = subscribeToGameInvites((invites) => {
        setGameInvites(invites);
      });

      return () => {
        if (unsubscribeInvites) unsubscribeInvites();
      };
    }
  }, [user]);

  const saveToHistory = (game) => {
    if (user === 'guest' || !user) {
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
    setSelectedGroupId(group.id);
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
        groupId: selectedGroupId || null,
        players: [player],
        status: 'lobby'
      };

      const { gameId: newGameId, code } = await createGame(gameData);

      if (inviteSelectedFriends.length > 0) {
        try {
          await sendGameInvite(
            inviteSelectedFriends,
            code,
            sessionName || 'Poker Game',
            playerName
          );
        } catch (error) {
          console.error('Error sending invites:', error);
        }
      }

      setGameId(newGameId);
      setGameCode(code);
      setCurrentPlayer(player);
      setPlayers([player]);
      setInviteSelectedFriends([]);

      const unsub = subscribeToGame(newGameId, (gameData) => {
        setPlayers(gameData.players || []);
      });
      setUnsubscribe(() => unsub);

      return { success: true };
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
      return { success: false };
    }
  };

  const joinGameHandler = async () => {
    if (!inputCode.trim() || !playerName.trim()) return;

    try {
      const gameData = await getGameByCode(inputCode);

      if (!gameData) {
        alert('Game not found. Please check the code.');
        return { success: false };
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

      const unsub = subscribeToGame(gameData.id, (data) => {
        setPlayers(data.players || []);
      });
      setUnsubscribe(() => unsub);

      return { success: true };
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game. Please try again.');
      return { success: false };
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

  const markPaid = (idx) => {
    const updated = [...settlements];
    updated[idx] = { ...updated[idx], paid: !updated[idx].paid };
    setSettlements(updated);
  };

  const calculateSettlements = () => {
    const setts = optimizeSettlement(players);
    setSettlements(setts);
  };

  const value = {
    // State
    gameCode,
    gameId,
    inputCode,
    playerName,
    venmoUsername,
    players,
    currentPlayer,
    buyInInput,
    settlements,
    gameNotes,
    sessionName,
    savedGroups,
    newGroupName,
    gameHistory,
    copied,
    user,
    authChecked,
    selectedGroupId,
    friends,
    pendingRequests,
    sentRequests,
    inviteSelectedFriends,
    gameInvites,

    // Setters
    setGameCode,
    setGameId,
    setInputCode,
    setPlayerName,
    setVenmoUsername,
    setPlayers,
    setCurrentPlayer,
    setBuyInInput,
    setSettlements,
    setGameNotes,
    setSessionName,
    setNewGroupName,
    setInviteSelectedFriends,

    // Functions
    saveToHistory,
    calculateStats,
    saveGroup,
    loadGroup,
    deleteGroup,
    resetApp,
    createGameHandler,
    joinGameHandler,
    addBuyIn,
    copyCode,
    shareCode,
    generateVenmoLink,
    startGame,
    kickPlayer,
    updateFinalChips,
    markPaid,
    calculateSettlements,
    dollarsToCents,
    centsToDollars,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
