import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { auth } from './firebase';

// User data cache to prevent N+1 queries
const userCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get user data with caching
const getCachedUserData = async (userId) => {
  const now = Date.now();
  const cached = userCache.get(userId);

  // Return cached data if it's still valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  // Fetch fresh data if not cached or expired
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    const userData = { id: userId, ...userDoc.data() };
    userCache.set(userId, { data: userData, timestamp: now });
    return userData;
  }

  return null;
};

// Generate friendship document ID (always smaller ID first for consistency)
const getFriendshipId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

// Ensure user document exists in Firestore
export const ensureUserDocument = async (user) => {
  if (!user || !user.uid) return;

  try {
    const userRef = doc(db, 'users', user.uid);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore operation timed out')), 10000)
    );

    const userDoc = await Promise.race([
      getDoc(userRef),
      timeoutPromise
    ]);

    if (!userDoc.exists()) {
      // Create new user document
      await Promise.race([
        setDoc(userRef, {
          email: user.email?.toLowerCase() || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          stats: {
            totalGames: 0,
            totalWinnings: 0,
            gamesWon: 0,
            winRate: 0
          }
        }),
        timeoutPromise
      ]);
    } else {
      // Update existing document with latest info
      await Promise.race([
        updateDoc(userRef, {
          displayName: user.displayName || userDoc.data().displayName || '',
          photoURL: user.photoURL || userDoc.data().photoURL || '',
          updatedAt: serverTimestamp()
        }),
        timeoutPromise
      ]);
    }
  } catch (error) {
    console.error('Error in ensureUserDocument:', error);
    // Don't throw - allow auth to continue even if Firestore fails
  }
};

// Send friend request
export const sendFriendRequest = async (friendEmail) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  // Find user by email
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', friendEmail.toLowerCase()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('User not found');
  }

  const friendDoc = querySnapshot.docs[0];
  const friendId = friendDoc.id;
  const friendData = friendDoc.data();

  if (friendId === currentUser.uid) {
    throw new Error('Cannot add yourself as a friend');
  }

  // Check if friendship already exists
  const friendshipId = getFriendshipId(currentUser.uid, friendId);
  const friendshipDoc = await getDoc(doc(db, 'friendships', friendshipId));

  if (friendshipDoc.exists()) {
    const status = friendshipDoc.data().status;
    if (status === 'accepted') {
      throw new Error('Already friends');
    } else if (status === 'pending') {
      throw new Error('Friend request already sent');
    }
  }

  // Create friendship document
  await setDoc(doc(db, 'friendships', friendshipId), {
    users: [currentUser.uid, friendId],
    requesterId: currentUser.uid,
    receiverId: friendId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return { friendId, friendData };
};

// Accept friend request
export const acceptFriendRequest = async (friendId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const friendshipId = getFriendshipId(currentUser.uid, friendId);
  const friendshipRef = doc(db, 'friendships', friendshipId);
  const friendshipDoc = await getDoc(friendshipRef);

  if (!friendshipDoc.exists()) {
    throw new Error('Friend request not found');
  }

  const data = friendshipDoc.data();
  if (data.receiverId !== currentUser.uid) {
    throw new Error('Cannot accept this request');
  }

  await updateDoc(friendshipRef, {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

// Reject friend request
export const rejectFriendRequest = async (friendId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const friendshipId = getFriendshipId(currentUser.uid, friendId);
  await deleteDoc(doc(db, 'friendships', friendshipId));
};

// Remove friend
export const removeFriend = async (friendId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const friendshipId = getFriendshipId(currentUser.uid, friendId);
  await deleteDoc(doc(db, 'friendships', friendshipId));
};

// Cancel sent friend request
export const cancelFriendRequest = async (friendId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const friendshipId = getFriendshipId(currentUser.uid, friendId);
  const friendshipRef = doc(db, 'friendships', friendshipId);
  const friendshipDoc = await getDoc(friendshipRef);

  if (!friendshipDoc.exists()) {
    throw new Error('Friend request not found');
  }

  const data = friendshipDoc.data();
  if (data.requesterId !== currentUser.uid) {
    throw new Error('Cannot cancel this request');
  }

  await deleteDoc(friendshipRef);
};

// Get all friends (accepted)
export const getFriends = async (userId = null) => {
  const currentUser = auth.currentUser;
  const targetUserId = userId || currentUser?.uid;
  if (!targetUserId) throw new Error('User ID required');

  const friendshipsRef = collection(db, 'friendships');
  const q = query(
    friendshipsRef,
    where('users', 'array-contains', targetUserId),
    where('status', '==', 'accepted')
  );

  const querySnapshot = await getDocs(q);

  // Use Promise.all to fetch all user data in parallel with caching
  const friendPromises = querySnapshot.docs.map(async (docSnap) => {
    const data = docSnap.data();
    const friendId = data.users.find(id => id !== targetUserId);

    // Get friend's user data from cache
    const friendUserData = await getCachedUserData(friendId);
    if (friendUserData) {
      return {
        ...friendUserData,
        friendshipId: docSnap.id,
        friendsSince: data.acceptedAt
      };
    }
    return null;
  });

  const friends = (await Promise.all(friendPromises)).filter(f => f !== null);
  return friends;
};

// Get pending friend requests (received)
export const getPendingRequests = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const friendshipsRef = collection(db, 'friendships');
  const q = query(
    friendshipsRef,
    where('receiverId', '==', currentUser.uid),
    where('status', '==', 'pending')
  );

  const querySnapshot = await getDocs(q);

  // Use Promise.all to fetch all user data in parallel with caching
  const requestPromises = querySnapshot.docs.map(async (docSnap) => {
    const data = docSnap.data();

    // Get requester's user data from cache
    const requesterUserData = await getCachedUserData(data.requesterId);
    if (requesterUserData) {
      return {
        ...requesterUserData,
        friendshipId: docSnap.id,
        requestedAt: data.createdAt
      };
    }
    return null;
  });

  const requests = (await Promise.all(requestPromises)).filter(r => r !== null);
  return requests;
};

// Get sent friend requests (pending)
export const getSentRequests = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const friendshipsRef = collection(db, 'friendships');
  const q = query(
    friendshipsRef,
    where('requesterId', '==', currentUser.uid),
    where('status', '==', 'pending')
  );

  const querySnapshot = await getDocs(q);

  // Use Promise.all to fetch all user data in parallel with caching
  const requestPromises = querySnapshot.docs.map(async (docSnap) => {
    const data = docSnap.data();

    // Get receiver's user data from cache
    const receiverUserData = await getCachedUserData(data.receiverId);
    if (receiverUserData) {
      return {
        ...receiverUserData,
        friendshipId: docSnap.id,
        requestedAt: data.createdAt
      };
    }
    return null;
  });

  const requests = (await Promise.all(requestPromises)).filter(r => r !== null);
  return requests;
};

// Subscribe to friends updates (real-time)
export const subscribeToFriends = (callback) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const friendshipsRef = collection(db, 'friendships');
  const q = query(
    friendshipsRef,
    where('users', 'array-contains', currentUser.uid)
  );

  return onSnapshot(q, async (snapshot) => {
    const friends = [];
    const pending = [];
    const sent = [];

    // Use Promise.all to fetch all user data in parallel (more efficient than sequential)
    const userDataPromises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const friendId = data.users.find(id => id !== currentUser.uid);

      // Get friend's user data from cache
      const friendUserData = await getCachedUserData(friendId);
      if (friendUserData) {
        return {
          friendData: {
            ...friendUserData,
            friendshipId: docSnap.id,
            status: data.status
          },
          data
        };
      }
      return null;
    });

    const results = await Promise.all(userDataPromises);

    // Process results
    for (const result of results) {
      if (!result) continue;

      const { friendData, data } = result;

      if (data.status === 'accepted') {
        friends.push({ ...friendData, friendsSince: data.acceptedAt });
      } else if (data.status === 'pending') {
        if (data.receiverId === currentUser.uid) {
          pending.push({ ...friendData, requestedAt: data.createdAt });
        } else {
          sent.push({ ...friendData, requestedAt: data.createdAt });
        }
      }
    }

    callback({ friends, pending, sent });
  });
};

// Search users by email or display name
export const searchUsers = async (searchTerm) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const usersRef = collection(db, 'users');
  const results = [];

  // Search by email
  const emailQuery = query(
    usersRef,
    where('email', '>=', searchTerm.toLowerCase()),
    where('email', '<=', searchTerm.toLowerCase() + '\uf8ff')
  );
  const emailSnapshot = await getDocs(emailQuery);

  emailSnapshot.forEach(doc => {
    if (doc.id !== currentUser.uid) {
      results.push({ id: doc.id, ...doc.data() });
    }
  });

  // Search by display name
  if (searchTerm.length >= 2) {
    const nameQuery = query(
      usersRef,
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff')
    );
    const nameSnapshot = await getDocs(nameQuery);

    nameSnapshot.forEach(doc => {
      if (doc.id !== currentUser.uid && !results.find(r => r.id === doc.id)) {
        results.push({ id: doc.id, ...doc.data() });
      }
    });
  }

  return results.slice(0, 20); // Limit results
};

// Check friendship status with a user
export const getFriendshipStatus = async (friendId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const friendshipId = getFriendshipId(currentUser.uid, friendId);
  const friendshipDoc = await getDoc(doc(db, 'friendships', friendshipId));

  if (!friendshipDoc.exists()) {
    return null;
  }

  const data = friendshipDoc.data();
  return {
    status: data.status,
    isRequester: data.requesterId === currentUser.uid,
    isReceiver: data.receiverId === currentUser.uid
  };
};

// Get friend's game history
export const getFriendGameHistory = async (friendId) => {
  const gamesRef = collection(db, 'games');
  const q = query(
    gamesRef,
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const games = [];

  querySnapshot.forEach(doc => {
    const gameData = doc.data();
    // Check if friend was a player in this game
    if (gameData.players && gameData.players.some(p => p.id === friendId)) {
      games.push({
        id: doc.id,
        ...gameData
      });
    }
  });

  return games.slice(0, 20); // Limit to 20 most recent games
};

// Get friend's stats
export const getFriendStats = async (friendId) => {
  const friendDoc = await getDoc(doc(db, 'users', friendId));

  if (!friendDoc.exists()) {
    throw new Error('User not found');
  }

  const userData = friendDoc.data();
  const gameHistory = await getFriendGameHistory(friendId);

  // Calculate additional stats from game history
  let totalWinnings = 0;
  let totalGames = gameHistory.length;
  let gamesWon = 0;

  gameHistory.forEach(game => {
    const player = game.players?.find(p => p.id === friendId);
    if (player) {
      const winnings = (player.cashout || 0) - (player.buyin || 0);
      totalWinnings += winnings;
      if (winnings > 0) gamesWon++;
    }
  });

  return {
    displayName: userData.displayName,
    email: userData.email,
    photoURL: userData.photoURL,
    stats: userData.stats || {},
    totalGames,
    gamesWon,
    winRate: totalGames > 0 ? ((gamesWon / totalGames) * 100).toFixed(1) : 0,
    totalWinnings,
    gameHistory
  };
};

// Send game invitation
export const sendGameInvite = async (friendIds, gameCode, gameName, hostName) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const invites = friendIds.map(friendId => {
    const inviteId = doc(collection(db, 'gameInvites')).id;
    return setDoc(doc(db, 'gameInvites', inviteId), {
      fromUserId: currentUser.uid,
      fromUserName: hostName,
      toUserId: friendId,
      gameCode,
      gameName: gameName || 'Poker Game',
      status: 'pending',
      createdAt: serverTimestamp()
    });
  });

  await Promise.all(invites);
};

// Get pending game invites
export const getGameInvites = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const invitesRef = collection(db, 'gameInvites');
  const q = query(
    invitesRef,
    where('toUserId', '==', currentUser.uid),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const invites = [];

  querySnapshot.forEach(doc => {
    invites.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return invites;
};

// Accept/dismiss game invite
export const dismissGameInvite = async (inviteId) => {
  await updateDoc(doc(db, 'gameInvites', inviteId), {
    status: 'dismissed'
  });
};

// Subscribe to game invites
export const subscribeToGameInvites = (callback) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Must be logged in');

  const invitesRef = collection(db, 'gameInvites');
  const q = query(
    invitesRef,
    where('toUserId', '==', currentUser.uid),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const invites = [];
    snapshot.forEach(doc => {
      invites.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(invites);
  });
};
