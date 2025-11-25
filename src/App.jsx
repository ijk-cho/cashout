import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { GameProvider, useGame } from './contexts/GameContext';
import Auth from './Auth';

// Lazy load all screen components
const HomePage = lazy(() => import('./screens/HomePage'));
const HostGameScreen = lazy(() => import('./screens/HostGameScreen'));
const JoinGameScreen = lazy(() => import('./screens/JoinGameScreen'));
const GameLobbyScreen = lazy(() => import('./screens/GameLobbyScreen'));
const SettlementScreen = lazy(() => import('./screens/SettlementScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const HistoryScreen = lazy(() => import('./screens/HistoryScreen'));
const StatsScreen = lazy(() => import('./screens/StatsScreen'));
const LeaderboardsScreen = lazy(() => import('./screens/LeaderboardsScreen'));
const FriendsScreen = lazy(() => import('./screens/FriendsScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const GroupsScreen = lazy(() => import('./screens/GroupsScreen'));
const GameScreen = lazy(() => import('./screens/GameScreen'));

// Import components and utilities that are still needed for non-refactored screens
import { DollarSign, Users, Plus, Share2, Copy, Check, TrendingUp, History, ArrowRight, Trophy, UserPlus, User, X, Search } from 'lucide-react';
import { createGame, getGameByCode, updateGame, subscribeToGame, removePlayer, updatePaymentStatus } from './gameService';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  cancelFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
  searchUsers,
  getFriendshipStatus,
  getFriendStats,
  subscribeToFriends,
  sendGameInvite,
  getGameInvites,
  dismissGameInvite,
  subscribeToGameInvites
} from './friendService';
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
import InstallPrompt from './InstallPrompt';
import UpdateNotification from './UpdateNotification';
import IOSInstallGuide from './IOSInstallGuide';

// Utility functions
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

// Component to handle URL-based game code (redirect to join screen with code populated)
const GameCodeHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setInputCode, authChecked, user } = useGame();

  useEffect(() => {
    const urlGameCode = searchParams.get('code');

    if (urlGameCode && authChecked && user) {
      setInputCode(urlGameCode.toUpperCase());
      navigate('/join', { replace: true });
    } else if (urlGameCode && authChecked) {
      // If there's a code but no user, redirect to auth or handle as guest
      setInputCode(urlGameCode.toUpperCase());
      navigate('/join', { replace: true });
    }
  }, [searchParams, authChecked, user, navigate, setInputCode]);

  return null;
};

// Auth guard component
const AuthGuard = ({ children }) => {
  const { user, authChecked } = useGame();

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return children;
};

// Loading fallback component
const LazyLoadFallback = () => (
  <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

// Main App Routes
const AppRoutes = () => {
  return (
    <>
      <GameCodeHandler />
      <Suspense fallback={<LazyLoadFallback />}>
        <Routes>
          <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
          <Route path="/host" element={<AuthGuard><HostGameScreen /></AuthGuard>} />
          <Route path="/join" element={<AuthGuard><JoinGameScreen /></AuthGuard>} />
          <Route path="/lobby" element={<AuthGuard><GameLobbyScreen /></AuthGuard>} />
          <Route path="/settlement" element={<AuthGuard><SettlementScreen /></AuthGuard>} />

          {/* Refactored screen routes */}
          <Route path="/profile" element={<AuthGuard><ProfileScreen /></AuthGuard>} />
          <Route path="/history" element={<AuthGuard><HistoryScreen /></AuthGuard>} />
          <Route path="/stats" element={<AuthGuard><StatsScreen /></AuthGuard>} />
          <Route path="/leaderboards" element={<AuthGuard><LeaderboardsScreen /></AuthGuard>} />
          <Route path="/friends" element={<AuthGuard><FriendsScreen /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><SettingsScreen /></AuthGuard>} />
          <Route path="/groups" element={<AuthGuard><GroupsScreen /></AuthGuard>} />
          <Route path="/game" element={<AuthGuard><GameScreen /></AuthGuard>} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

// Main App component
const PokerSettleApp = () => {
  return (
    <BrowserRouter>
      <GameProvider>
        <AppRoutes />
      </GameProvider>
    </BrowserRouter>
  );
};

export default PokerSettleApp;
