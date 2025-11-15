// Premium UI Components for Cashout
// Drop-in replacements for current components with Offsuit-inspired design

import { TrendingUp, Users, DollarSign, Award, Trophy, Target } from 'lucide-react';

// ========================================
// BUTTONS
// ========================================

export const PrimaryButton = ({ children, onClick, disabled, icon: Icon }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="
      w-full
      bg-gradient-to-r from-[#D4AF37] to-[#C9A942]
      text-[#0A0E14]
      font-semibold
      text-base
      px-6 py-4
      rounded-xl
      shadow-[0_4px_16px_rgba(212,175,55,0.3)]
      hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)]
      hover:scale-[1.01]
      active:scale-[0.99]
      disabled:opacity-50
      disabled:cursor-not-allowed
      transition-all duration-200
      flex items-center justify-center gap-3
    "
  >
    {Icon && <Icon size={20} strokeWidth={2.5} />}
    {children}
  </button>
);

export const SecondaryButton = ({ children, onClick, disabled, icon: Icon }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="
      w-full
      bg-transparent
      border-2 border-[#D4AF37]/30
      text-[#D4AF37]
      font-semibold
      text-base
      px-6 py-4
      rounded-xl
      hover:bg-[#D4AF37]/10
      hover:border-[#D4AF37]/50
      active:scale-[0.99]
      disabled:opacity-50
      disabled:cursor-not-allowed
      transition-all duration-200
      flex items-center justify-center gap-3
    "
  >
    {Icon && <Icon size={20} strokeWidth={2.5} />}
    {children}
  </button>
);

export const GhostButton = ({ children, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className="
      w-full
      bg-transparent
      text-[#CBD5E1]
      font-medium
      text-base
      px-6 py-3
      rounded-xl
      hover:bg-white/5
      active:scale-[0.99]
      transition-all duration-200
      flex items-center justify-center gap-2
    "
  >
    {Icon && <Icon size={18} strokeWidth={2} />}
    {children}
  </button>
);

export const DangerButton = ({ children, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className="
      w-full
      bg-gradient-to-r from-[#EF4444] to-[#DC2626]
      text-white
      font-semibold
      text-base
      px-6 py-4
      rounded-xl
      shadow-[0_4px_16px_rgba(239,68,68,0.3)]
      hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)]
      hover:scale-[1.01]
      active:scale-[0.99]
      transition-all duration-200
      flex items-center justify-center gap-3
    "
  >
    {Icon && <Icon size={20} strokeWidth={2.5} />}
    {children}
  </button>
);

// ========================================
// CARDS
// ========================================

export const PremiumCard = ({ children, className = '' }) => (
  <div className={`
    bg-gradient-to-br from-[#1E2433] to-[#252B3D]
    rounded-2xl
    border border-white/5
    shadow-[0_8px_32px_rgba(0,0,0,0.4)]
    backdrop-blur-xl
    hover:border-[#D4AF37]/20
    transition-all duration-300
    ${className}
  `}>
    {children}
  </div>
);

export const GlassCard = ({ children, className = '' }) => (
  <div className={`
    bg-white/5
    rounded-2xl
    border border-white/10
    backdrop-blur-2xl
    shadow-[0_8px_32px_rgba(0,0,0,0.3)]
    ${className}
  `}>
    {children}
  </div>
);

export const BaseCard = ({ children, className = '' }) => (
  <div className={`
    bg-[#1E2433]
    rounded-2xl
    border border-white/5
    shadow-[0_4px_24px_rgba(0,0,0,0.4)]
    ${className}
  `}>
    {children}
  </div>
);

// ========================================
// STATS COMPONENTS
// ========================================

export const StatCard = ({ label, value, trend, icon: Icon, positive }) => (
  <div className="
    bg-gradient-to-br from-[#1E2433] to-[#252B3D]
    rounded-2xl
    border border-white/5
    p-6
    hover:border-[#D4AF37]/20
    transition-all duration-300
  ">
    <div className="flex items-center justify-between mb-3">
      <div className="text-[#64748B] text-xs font-medium uppercase tracking-wider">
        {label}
      </div>
      {Icon && (
        <Icon className="text-[#D4AF37] opacity-40" size={20} strokeWidth={2} />
      )}
    </div>
    <div className={`text-3xl font-bold mb-1 ${
      positive === true ? 'text-[#10B981]' :
      positive === false ? 'text-[#EF4444]' :
      'text-[#F8FAFC]'
    }`}>
      {value}
    </div>
    {trend && (
      <div className="text-[#64748B] text-sm flex items-center gap-1">
        {trend}
      </div>
    )}
  </div>
);

export const InlineStat = ({ label, value }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-[#CBD5E1] text-sm">{label}</span>
    <span className="text-[#F8FAFC] text-lg font-semibold">{value}</span>
  </div>
);

// ========================================
// INPUT COMPONENTS
// ========================================

export const PremiumInput = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange,
  label,
  error
}) => (
  <div className="w-full">
    {label && (
      <label className="block text-[#CBD5E1] text-sm font-medium mb-2 uppercase tracking-wide">
        {label}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="
        w-full
        bg-[#12161F]
        border border-white/10
        text-[#F8FAFC]
        placeholder:text-[#64748B]
        px-4 py-3.5
        rounded-xl
        focus:outline-none
        focus:ring-2
        focus:ring-[#D4AF37]/50
        focus:border-[#D4AF37]/50
        transition-all duration-200
      "
    />
    {error && (
      <p className="text-[#EF4444] text-sm mt-1">{error}</p>
    )}
  </div>
);

export const CodeInput = ({ value, onChange, maxLength = 6 }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    maxLength={maxLength}
    className="
      w-full
      bg-[#12161F]
      border-2 border-white/10
      text-[#F8FAFC]
      font-mono
      text-center
      text-4xl
      tracking-[0.5em]
      px-4 py-6
      rounded-2xl
      focus:outline-none
      focus:ring-2
      focus:ring-[#D4AF37]/50
      focus:border-[#D4AF37]
      transition-all duration-200
      uppercase
    "
    placeholder="------"
  />
);

// ========================================
// BADGES & PILLS
// ========================================

export const StatusBadge = ({ children, variant = 'success' }) => {
  const variants = {
    success: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
    warning: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
    danger: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
    info: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20',
  };

  return (
    <span className={`
      inline-flex items-center
      ${variants[variant]}
      border
      px-3 py-1
      rounded-full
      text-xs
      font-medium
      uppercase
      tracking-wide
    `}>
      {children}
    </span>
  );
};

export const CountBadge = ({ count }) => (
  <span className="
    inline-flex items-center justify-center
    bg-[#D4AF37]
    text-[#0A0E14]
    min-w-[24px]
    h-6
    px-2
    rounded-full
    text-xs
    font-bold
  ">
    {count}
  </span>
);

// ========================================
// PLAYER CARD
// ========================================

export const PlayerCard = ({ 
  name, 
  buyIn, 
  chipCount, 
  profit, 
  isHost,
  avatar 
}) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="
      bg-[#1E2433]
      rounded-xl
      border border-white/5
      p-4
      hover:border-white/10
      transition-all duration-200
    ">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="
            w-12 h-12
            bg-gradient-to-br from-[#D4AF37] to-[#C9A942]
            rounded-full
            flex items-center justify-center
            font-bold
            text-[#0A0E14]
            text-sm
          ">
            {avatar || initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#F8FAFC] font-semibold">{name}</span>
              {isHost && (
                <StatusBadge variant="info">Host</StatusBadge>
              )}
            </div>
            <div className="text-[#64748B] text-sm">
              ${buyIn} in {chipCount && `• ${chipCount} chips`}
            </div>
          </div>
        </div>
        
        {profit !== undefined && (
          <div className="text-right">
            <div className={`text-lg font-semibold ${
              profit > 0 ? 'text-[#10B981]' : 
              profit < 0 ? 'text-[#EF4444]' : 
              'text-[#64748B]'
            }`}>
              {profit > 0 ? '+' : ''}${Math.abs(profit)}
            </div>
            <div className="text-[#64748B] text-xs">
              {profit > 0 ? 'Profit' : profit < 0 ? 'Loss' : 'Even'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================
// GAME HEADER
// ========================================

export const GameHeader = ({ gameCode, sessionName, onBack, onMenu }) => (
  <div className="flex items-center justify-between mb-6">
    <button 
      onClick={onBack}
      className="
        text-[#CBD5E1]
        hover:text-[#F8FAFC]
        hover:bg-white/5
        p-2
        rounded-lg
        transition-all duration-200
      "
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    
    <div className="text-center">
      {sessionName && (
        <div className="text-[#CBD5E1] text-sm mb-1">{sessionName}</div>
      )}
      <div className="text-[#64748B] text-xs uppercase tracking-wider">Code</div>
      <div className="text-[#D4AF37] text-xl font-mono font-bold tracking-wider">
        {gameCode}
      </div>
    </div>
    
    <button 
      onClick={onMenu}
      className="
        text-[#CBD5E1]
        hover:text-[#F8FAFC]
        hover:bg-white/5
        p-2
        rounded-lg
        transition-all duration-200
      "
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    </button>
  </div>
);

// ========================================
// POT DISPLAY
// ========================================

export const PotDisplay = ({ amount, playerCount, buyInCount }) => (
  <div className="
    bg-[#12161F]
    rounded-2xl
    border border-white/5
    p-8
    text-center
    mb-6
  ">
    <div className="text-[#64748B] text-sm uppercase tracking-wider mb-3">
      Total Pot
    </div>
    <div className="text-[#F8FAFC] text-5xl font-bold mb-3">
      ${amount.toLocaleString()}
    </div>
    <div className="text-[#64748B] text-sm">
      {playerCount} players • {buyInCount} buy-ins
    </div>
  </div>
);

// ========================================
// LOADING SPINNER
// ========================================

export const LoadingSpinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className={`
      ${sizes[size]}
      border-white/10
      border-t-[#D4AF37]
      rounded-full
      animate-spin
    `} />
  );
};

// ========================================
// EXPORT ALL
// ========================================

export default {
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
};
