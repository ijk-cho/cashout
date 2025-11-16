import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useGame } from '../contexts/GameContext';

const SettlementScreen = () => {
  const navigate = useNavigate();
  const {
    players,
    settlements,
    gameNotes,
    setGameNotes,
    centsToDollars,
    generateVenmoLink,
    markPaid,
    resetApp,
  } = useGame();

  const handleDone = () => {
    resetApp();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 premium-pattern"></div>

      <div className="max-w-4xl mx-auto pt-8 relative z-10">
        <h2 className="text-3xl font-serif font-bold mb-6 text-[#D4AF37] text-center">Game Complete!</h2>

        {/* Final Results */}
        <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
          <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Final Results</h3>
          <div className="space-y-2">
            {players.sort((a, b) => b.netResultCents - a.netResultCents).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#12161F] p-3 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-full flex items-center justify-center font-bold text-[#D4AF37] border-2 border-[#D4AF37]/50">
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-[#F8FAFC]">{p.name}</span>
                </div>
                <div className={`text-2xl font-mono font-bold ${p.netResultCents >= 0 ? 'text-emerald-300' : 'text-poker-burgundy'}`}>
                  {p.netResultCents >= 0 ? '+' : ''}${centsToDollars(p.netResultCents)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settlements */}
        {settlements.length > 0 && (
          <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
            <h3 className="text-xl font-serif font-bold text-[#D4AF37] mb-4">Settlement Plan</h3>
            <div className="space-y-3">
              {settlements.map((s, idx) => (
                <div key={idx} className="bg-[#12161F] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#F8FAFC]">{s.from}</span>
                      <ArrowRight className="text-[#D4AF37]" size={20} />
                      <span className="font-semibold text-[#F8FAFC]">{s.to}</span>
                    </div>
                    <div className="text-xl font-mono font-bold text-[#D4AF37]">
                      ${centsToDollars(s.amountCents)}
                    </div>
                  </div>
                  {s.toVenmo && (
                    <div className="flex gap-2">
                      <a
                        href={generateVenmoLink(s.toVenmo, s.amountCents)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] text-[#0A0E14] font-semibold py-2 rounded-xl transition-all duration-200 text-center"
                      >
                        Pay via Venmo
                      </a>
                      <button
                        onClick={() => markPaid(idx)}
                        className={`flex-1 ${s.paid ? 'bg-[#10B981]' : 'bg-[#1E2433] border border-white/10'} hover:opacity-80 text-[#F8FAFC] font-semibold py-2 rounded-xl transition-all duration-200`}
                      >
                        {s.paid ? '✓ Paid' : 'Mark Paid'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Notes */}
        <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
          <label className="block text-sm text-[#D4AF37] mb-2 font-semibold uppercase tracking-wide">Game Notes (Optional)</label>
          <textarea
            value={gameNotes}
            onChange={(e) => setGameNotes(e.target.value)}
            placeholder="How was the game? Any memorable hands?"
            className="w-full bg-[#0A0E14] text-[#F8FAFC] px-4 py-3 rounded-xl border border-white/10 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-poker-gold placeholder:text-[#64748B]"
          />
        </div>

        <button
          onClick={handleDone}
          className="w-full bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)] text-[#F8FAFC] font-bold py-4 rounded-2xl border-2 border-[#D4AF37]/50 transition-all duration-200 shadow-xl"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default SettlementScreen;
