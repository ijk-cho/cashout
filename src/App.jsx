import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { GameProvider, useGame } from './contexts/GameContext';
import Auth from './Auth';
import ProfilePage from './ProfilePage';
import HomePage from './screens/HomePage';
import HostGameScreen from './screens/HostGameScreen';
import JoinGameScreen from './screens/JoinGameScreen';
import GameLobbyScreen from './screens/GameLobbyScreen';
import SettlementScreen from './screens/SettlementScreen';

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
import ComingSoon from './components/ComingSoon';

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

// Legacy screens wrapper for non-refactored screens
const LegacyScreensWrapper = ({ screenName }) => {
  return <ComingSoon screenName={screenName} />;
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

// Main App Routes
const AppRoutes = () => {
  return (
    <>
      <GameCodeHandler />
      <Routes>
        <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
        <Route path="/host" element={<AuthGuard><HostGameScreen /></AuthGuard>} />
        <Route path="/join" element={<AuthGuard><JoinGameScreen /></AuthGuard>} />
        <Route path="/lobby" element={<AuthGuard><GameLobbyScreen /></AuthGuard>} />
        <Route path="/settlement" element={<AuthGuard><SettlementScreen /></AuthGuard>} />

        {/* Legacy routes - to be refactored later */}
        <Route path="/profile" element={<AuthGuard><LegacyScreensWrapper screenName="Profile" /></AuthGuard>} />
        <Route path="/history" element={<AuthGuard><LegacyScreensWrapper screenName="History" /></AuthGuard>} />
        <Route path="/stats" element={<AuthGuard><LegacyScreensWrapper screenName="Stats" /></AuthGuard>} />
        <Route path="/leaderboards" element={<AuthGuard><LegacyScreensWrapper screenName="Leaderboards" /></AuthGuard>} />
        <Route path="/friends" element={<AuthGuard><LegacyScreensWrapper screenName="Friends" /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><LegacyScreensWrapper screenName="Settings" /></AuthGuard>} />
        <Route path="/groups" element={<AuthGuard><LegacyScreensWrapper screenName="Groups" /></AuthGuard>} />
        <Route path="/game" element={<AuthGuard><LegacyScreensWrapper screenName="Game" /></AuthGuard>} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
