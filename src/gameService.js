import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

// Generate unique game code
export const generateGameCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// Check if code exists
export const checkCodeExists = async (code) => {
  const codeDoc = await getDoc(doc(db, 'activeCodes', code));
  return codeDoc.exists();
};

// Generate unique code that doesn't exist
export const generateUniqueCode = async () => {
  let code;
  let exists = true;
  
  while (exists) {
    code = generateGameCode();
    exists = await checkCodeExists(code);
  }
  
  return code;
};

// Create new game
export const createGame = async (gameData) => {
  const gameId = doc(collection(db, 'games')).id;
  const code = await generateUniqueCode();
  
  const game = {
    ...gameData,
    id: gameId,
    code,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'lobby'
  };
  
  // Save game
  await setDoc(doc(db, 'games', gameId), game);
  
  // Save active code
  await setDoc(doc(db, 'activeCodes', code), {
    gameId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });
  
  return { gameId, code };
};

// Get game by code
export const getGameByCode = async (code) => {
  const codeDoc = await getDoc(doc(db, 'activeCodes', code));
  
  if (!codeDoc.exists()) {
    throw new Error('Invalid game code');
  }
  
  const { gameId } = codeDoc.data();
  const gameDoc = await getDoc(doc(db, 'games', gameId));
  
  if (!gameDoc.exists()) {
    throw new Error('Game not found');
  }
  
  return { id: gameDoc.id, ...gameDoc.data() };
};

// Update game
export const updateGame = async (gameId, updates) => {
  await updateDoc(doc(db, 'games', gameId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Listen to game updates (real-time)
export const subscribeToGame = (gameId, callback) => {
  return onSnapshot(doc(db, 'games', gameId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};

// Delete expired codes (cleanup)
export const deleteExpiredCode = async (code) => {
  await deleteDoc(doc(db, 'activeCodes', code));
};

// Remove player from game
export const removePlayer = async (gameId, playerId, players) => {
  const updatedPlayers = players.filter(p => p.id !== playerId);
  await updateGame(gameId, { players: updatedPlayers });
  return updatedPlayers;
};