import React, { useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import {
  PrimaryButton,
  DangerButton,
  GhostButton,
  GameHeader,
  PotDisplay,
  PlayerCard,
  PremiumInput,
  PremiumCard,
} from './components/PremiumUI';

/**
 * PREMIUM GAME SCREEN
 * Clean, minimal game interface
 */

const PremiumGameScreen = ({
  gameCode,
  sessionName,
  players,
  currentPlayer,
  onBack,
  onAddBuyIn,
  onEndGame,
}) => {
  const [buyInAmount, setBuyInAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const totalPot = players.reduce((sum, p) => sum + p.totalBuyInCents, 0) / 100;
  const totalBuyIns = players.reduce((sum, p) => sum + p.buyInsCents.length, 0);

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

  return (
    <div className="min-h-screen bg-[#0A0E14]">
      {/* Subtle Background */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="relative z-10 max-w-md mx-auto p-6">
        {/* Header with Game Code */}
        <GameHeader
          gameCode={gameCode}
          sessionName={sessionName}
          onBack={onBack}
          onMenu={() => {}}
        />

        {/* Game Code Share Card */}
        <PremiumCard className="p-6 mb-6">
          <div className="text-center">
            <div className="text-[#64748B] text-xs uppercase tracking-wider mb-3">
              Share Game Code
            </div>
            <div className="
              text-[#D4AF37]
              text-4xl
              font-mono
              font-bold
              tracking-[0.3em]
              mb-4
              px-4
              py-3
              bg-[#12161F]
              rounded-xl
              border border-[#D4AF37]/20
            ">
              {gameCode}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="
                  flex-1
                  bg-white/5
                  border border-white/10
                  text-[#CBD5E1]
                  font-medium
                  py-3
                  rounded-lg
                  hover:bg-white/10
                  hover:border-white/20
                  transition-all duration-200
                  flex items-center justify-center gap-2
                "
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={shareCode}
                className="
                  flex-1
                  bg-[#EF4444]
                  text-white
                  font-medium
                  py-3
                  rounded-lg
                  hover:bg-[#DC2626]
                  transition-all duration-200
                  flex items-center justify-center gap-2
                "
              >
                <Share2 size={18} />
                Share
              </button>
            </div>
          </div>
        </PremiumCard>

        {/* Pot Display */}
        <PotDisplay
          amount={totalPot}
          playerCount={players.length}
          buyInCount={totalBuyIns}
        />

        {/* Add Buy-In Section (if user is playing) */}
        {currentPlayer && (
          <PremiumCard className="p-6 mb-6">
            <h3 className="text-[#F8FAFC] font-semibold mb-4">Add Buy-In</h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <PremiumInput
                  type="number"
                  placeholder="Amount"
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(e.target.value)}
                />
              </div>
              <button
                onClick={() => {
                  if (buyInAmount) {
                    onAddBuyIn(currentPlayer.id, parseFloat(buyInAmount));
                    setBuyInAmount('');
                  }
                }}
                className="
                  bg-[#D4AF37]
                  text-[#0A0E14]
                  font-semibold
                  px-6
                  rounded-xl
                  hover:bg-[#C9A942]
                  active:scale-95
                  transition-all duration-200
                "
              >
                Add
              </button>
            </div>
          </PremiumCard>
        )}

        {/* Players List */}
        <div className="mb-6">
          <div className="text-[#64748B] text-sm font-medium uppercase tracking-wider mb-3">
            Players ({players.length})
          </div>
          <div className="space-y-2">
            {players.map(player => (
              <PlayerCard
                key={player.id}
                name={player.name}
                buyIn={(player.totalBuyInCents / 100).toFixed(2)}
                chipCount={player.finalChipsCents ? (player.finalChipsCents / 100).toFixed(2) : null}
                profit={player.netResultCents ? player.netResultCents / 100 : undefined}
                isHost={player.isHost}
              />
            ))}
          </div>
        </div>

        {/* Host Controls */}
        {currentPlayer?.isHost && (
          <div className="space-y-3">
            <PrimaryButton onClick={onEndGame}>
              End Game & Settle
            </PrimaryButton>
            <GhostButton onClick={onBack}>
              Cancel Game
            </GhostButton>
          </div>
        )}

        {/* Non-host can only leave */}
        {currentPlayer && !currentPlayer.isHost && (
          <DangerButton onClick={onBack}>
            Leave Game
          </DangerButton>
        )}
      </div>
    </div>
  );
};

export default PremiumGameScreen;
