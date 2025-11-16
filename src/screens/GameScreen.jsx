import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Plus, Minus, Users, TrendingUp } from 'lucide-react';
import {
  PrimaryButton,
  GhostButton,
  PremiumCard,
  PremiumInput,
} from '../components/PremiumUI';

const GameScreen = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [buyInAmount, setBuyInAmount] = useState('');

  const handleBack = () => {
    navigate('/');
  };

  const handleAddPlayer = () => {
    if (!playerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    const newPlayer = {
      id: Date.now().toString(),
      name: playerName.trim(),
      buyIns: [],
      totalBuyIn: 0,
    };

    setPlayers([...players, newPlayer]);
    setPlayerName('');
  };

  const handleAddBuyIn = (playerId) => {
    if (!buyInAmount || parseFloat(buyInAmount) <= 0) {
      alert('Please enter a valid buy-in amount');
      return;
    }

    const amount = parseFloat(buyInAmount);
    setPlayers(players.map(player => {
      if (player.id === playerId) {
        return {
          ...player,
          buyIns: [...player.buyIns, { amount, timestamp: new Date().toISOString() }],
          totalBuyIn: player.totalBuyIn + amount,
        };
      }
      return player;
    }));
    setBuyInAmount('');
  };

  const handleRemoveBuyIn = (playerId, buyInIndex) => {
    setPlayers(players.map(player => {
      if (player.id === playerId) {
        const removedAmount = player.buyIns[buyInIndex].amount;
        const newBuyIns = player.buyIns.filter((_, index) => index !== buyInIndex);
        return {
          ...player,
          buyIns: newBuyIns,
          totalBuyIn: player.totalBuyIn - removedAmount,
        };
      }
      return player;
    }));
  };

  const handleRemovePlayer = (playerId) => {
    if (window.confirm('Remove this player?')) {
      setPlayers(players.filter(p => p.id !== playerId));
    }
  };

  const totalPot = players.reduce((sum, player) => sum + player.totalBuyIn, 0);

  return (
    <div className="min-h-screen bg-[#0A0E14] p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <button
          onClick={handleBack}
          className="text-[#CBD5E1] hover:text-[#F8FAFC] mb-6 flex items-center gap-2 hover:bg-white/5 p-2 rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-xl flex items-center justify-center">
            <DollarSign className="text-[#0A0E14]" size={24} />
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">Buy-In Tracker</h2>
        </div>

        {/* Total Pot Display */}
        <PremiumCard className="p-6 mb-6 text-center">
          <div className="text-sm text-[#D4AF37] mb-2 uppercase tracking-wide font-semibold">
            Total Pot
          </div>
          <div className="text-4xl font-bold text-[#F8FAFC]">
            ${totalPot.toFixed(2)}
          </div>
          <div className="text-sm text-[#64748B] mt-2">
            {players.length} player{players.length !== 1 ? 's' : ''}
          </div>
        </PremiumCard>

        {/* Add Player Form */}
        <PremiumCard className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Add Player</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <PremiumInput
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Player name"
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
              />
            </div>
            <PrimaryButton onClick={handleAddPlayer} icon={Plus}>
              Add
            </PrimaryButton>
          </div>
        </PremiumCard>

        {/* Players List */}
        {players.length === 0 ? (
          <PremiumCard className="p-12 text-center">
            <Users className="mx-auto mb-4 text-[#64748B]" size={48} />
            <p className="text-[#64748B] text-lg mb-2">No players yet</p>
            <p className="text-[#64748B] text-sm">
              Add players to start tracking buy-ins
            </p>
          </PremiumCard>
        ) : (
          <div className="space-y-3">
            {players.map((player) => (
              <PremiumCard key={player.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-[#F8FAFC]">
                        {player.name}
                      </h3>
                      <div className="bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1 rounded-lg text-sm font-semibold">
                        ${player.totalBuyIn.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-sm text-[#64748B]">
                      {player.buyIns.length} buy-in{player.buyIns.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePlayer(player.id)}
                    className="text-[#64748B] hover:text-[#EF4444] p-2 rounded-lg hover:bg-[#EF4444]/10 transition-all duration-200"
                  >
                    <Minus size={18} />
                  </button>
                </div>

                {/* Buy-ins List */}
                {player.buyIns.length > 0 && (
                  <div className="space-y-2 mb-4 pl-4">
                    {player.buyIns.map((buyIn, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-[#12161F] p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <TrendingUp className="text-[#10B981]" size={16} />
                          <span className="text-[#F8FAFC] font-medium">
                            ${buyIn.amount.toFixed(2)}
                          </span>
                          <span className="text-xs text-[#64748B]">
                            {new Date(buyIn.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveBuyIn(player.id, index)}
                          className="text-[#64748B] hover:text-[#EF4444] transition-colors duration-200"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Buy-in Form */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={buyInAmount}
                      onChange={(e) => setBuyInAmount(e.target.value)}
                      placeholder="Buy-in amount"
                      step="0.01"
                      min="0"
                      className="w-full bg-[#12161F] text-[#F8FAFC] px-4 py-2 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all duration-200 placeholder:text-[#64748B]"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddBuyIn(player.id)}
                    />
                  </div>
                  <button
                    onClick={() => handleAddBuyIn(player.id)}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14] px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 text-sm flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Buy-in
                  </button>
                </div>
              </PremiumCard>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {players.length > 0 && (
          <div className="mt-6">
            <GhostButton onClick={() => navigate('/settlement')}>
              Go to Settlement
            </GhostButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;
