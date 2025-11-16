import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { DollarSign, Users, Plus, History, TrendingUp, Trophy, UserPlus, X } from 'lucide-react';
import { dismissGameInvite } from '../friendService';
import { useGame } from '../contexts/GameContext';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  PremiumCard,
} from '../components/PremiumUI';
import InstallPrompt from '../InstallPrompt';
import UpdateNotification from '../UpdateNotification';
import IOSInstallGuide from '../IOSInstallGuide';

const HomePage = () => {
  const navigate = useNavigate();
  const {
    user,
    gameInvites,
    pendingRequests,
    savedGroups,
    gameHistory,
    calculateStats,
    setInputCode,
    setSavedGroups,
    setGameHistory,
  } = useGame();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const stats = calculateStats();

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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted install');
    }

    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

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
                      navigate('/profile');
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
                      navigate('/friends');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#D4AF37]/10 rounded-xl transition-all duration-200 text-left text-[#CBD5E1] hover:text-[#F8FAFC] relative"
                  >
                    <UserPlus className="w-5 h-5" />
                    Friends
                    {pendingRequests.length > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#D4AF37] text-[#0A0E14] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings');
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
                onClick={() => navigate('/auth')}
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

          {/* Game Invites */}
          {gameInvites.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#D4AF37] mb-3 uppercase tracking-wide">Game Invites</h3>
              <div className="space-y-2">
                {gameInvites.map(invite => (
                  <PremiumCard key={invite.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-[#F8FAFC]">{invite.gameName}</div>
                        <div className="text-sm text-[#64748B]">
                          From: {invite.fromUserName} • Code: <span className="text-[#D4AF37] font-mono">{invite.gameCode}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setInputCode(invite.gameCode);
                            navigate('/join');
                            dismissGameInvite(invite.id);
                          }}
                          className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14] font-semibold py-2 px-4 rounded-xl hover:shadow-lg transition-all duration-200 text-sm"
                        >
                          Join
                        </button>
                        <button
                          onClick={() => dismissGameInvite(invite.id)}
                          className="text-[#64748B] hover:text-[#EF4444] p-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </PremiumCard>
                ))}
              </div>
            </div>
          )}

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
            <PrimaryButton icon={Users} onClick={() => navigate('/host')}>
              Host New Game
            </PrimaryButton>

            <SecondaryButton icon={Plus} onClick={() => navigate('/join')}>
              Join Game
            </SecondaryButton>
          </div>

          {/* Load Group Button */}
          {savedGroups.length > 0 && (
            <div className="mb-4">
              <GhostButton icon={Users} onClick={() => navigate('/groups')}>
                Load Saved Group
              </GhostButton>
            </div>
          )}

          {/* Navigation Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/friends')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2 relative"
            >
              <UserPlus size={18} strokeWidth={2} />
              <span className="text-xs">Friends</span>
              {pendingRequests.length > 0 && (
                <span className="absolute top-2 right-2 bg-[#D4AF37] text-[#0A0E14] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/history')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <History size={18} strokeWidth={2} />
              <span className="text-xs">History</span>
            </button>

            <button
              onClick={() => navigate('/stats')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <TrendingUp size={18} strokeWidth={2} />
              <span className="text-xs">Stats</span>
            </button>

            <button
              onClick={() => navigate('/analytics')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <TrendingUp size={18} strokeWidth={2} />
              <span className="text-xs">Analytics</span>
            </button>

            <button
              onClick={() => navigate('/leaderboards')}
              className="bg-transparent border border-white/10 text-[#CBD5E1] font-medium py-3.5 px-4 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <Trophy size={20} />
              <span className="text-xs">Leaders</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
