import React from 'react';
import { Users, Plus, History, TrendingUp, Trophy, DollarSign } from 'lucide-react';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  PremiumCard,
  StatCard,
} from './components/PremiumUI';

/**
 * PREMIUM HOME SCREEN
 * Offsuit-inspired minimal, dark, sleek design
 */

const PremiumHomeScreen = ({ user, stats, onHostGame, onJoinGame, onViewHistory, onViewStats }) => {
  return (
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

      <div className="relative z-10 max-w-md mx-auto p-6">
        {/* Profile Section - Top Right */}
        {user && (
          <div className="absolute top-6 right-6">
            <button className="
              w-12 h-12
              bg-gradient-to-br from-[#D4AF37] to-[#C9A942]
              rounded-full
              flex items-center justify-center
              font-bold
              text-[#0A0E14]
              border-2 border-[#D4AF37]/20
              hover:scale-105
              active:scale-95
              transition-all duration-200
              shadow-[0_4px_16px_rgba(212,175,55,0.3)]
            ">
              {user.displayName?.[0] || user.email?.[0].toUpperCase()}
            </button>
          </div>
        )}

        {/* Logo / Brand */}
        <div className="text-center mb-12 pt-16">
          <div className="
            w-20 h-20
            mx-auto
            mb-6
            bg-gradient-to-br from-[#D4AF37] to-[#C9A942]
            rounded-2xl
            flex items-center justify-center
            shadow-[0_8px_32px_rgba(212,175,55,0.3)]
          ">
            <DollarSign size={40} className="text-[#0A0E14]" strokeWidth={3} />
          </div>
          
          <h1 className="
            text-5xl
            font-bold
            text-[#F8FAFC]
            mb-3
            tracking-tight
            drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]
          ">
            Cashout
          </h1>
          
          <div className="inline-block">
            <div className="
              text-[#D4AF37]
              text-sm
              font-medium
              uppercase
              tracking-[0.2em]
              px-4
              py-2
              border border-[#D4AF37]/30
              rounded-full
            ">
              Poker Settlement
            </div>
          </div>
        </div>

        {/* Quick Stats - Only show if user has played games */}
        {stats.totalGames > 0 && (
          <div className="mb-8 animate-[fadeIn_0.5s_ease-out]">
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

        {/* Primary Actions */}
        <div className="space-y-3 mb-6">
          <PrimaryButton icon={Users} onClick={onHostGame}>
            Host New Game
          </PrimaryButton>
          
          <SecondaryButton icon={Plus} onClick={onJoinGame}>
            Join Game
          </SecondaryButton>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onViewHistory}
            className="
              bg-transparent
              border border-white/10
              text-[#CBD5E1]
              font-medium
              py-3.5
              px-4
              rounded-xl
              hover:bg-white/5
              hover:border-white/20
              transition-all duration-200
              flex items-center justify-center gap-2
            "
          >
            <History size={18} strokeWidth={2} />
            <span>History</span>
          </button>
          
          <button
            onClick={onViewStats}
            className="
              bg-transparent
              border border-white/10
              text-[#CBD5E1]
              font-medium
              py-3.5
              px-4
              rounded-xl
              hover:bg-white/5
              hover:border-white/20
              transition-all duration-200
              flex items-center justify-center gap-2
            "
          >
            <TrendingUp size={18} strokeWidth={2} />
            <span>Stats</span>
          </button>
        </div>

        {/* Footer Tagline */}
        <div className="text-center mt-16 text-[#64748B] text-sm">
          Settle your poker games, no scam.
        </div>
      </div>
    </div>
  );
};

export default PremiumHomeScreen;
