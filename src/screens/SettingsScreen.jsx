import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, Bell, Shield, Trash2, LogOut, Moon, Sun } from 'lucide-react';
import { auth } from '../firebase';
import { useGame } from '../contexts/GameContext';
import {
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  PremiumCard,
  PremiumInput,
} from '../components/PremiumUI';

const SettingsScreen = () => {
  const navigate = useNavigate();
  const { user, setGameHistory, setSavedGroups } = useGame();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleBack = () => {
    navigate('/');
  };

  const handleUpdateProfile = () => {
    // TODO: Implement Firebase profile update
    console.log('Update profile:', { displayName, venmoUsername });
    alert('Profile update coming soon!');
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all game history? This cannot be undone.')) {
      setGameHistory([]);
      localStorage.removeItem('pokerGameHistory');
      alert('History cleared');
    }
  };

  const handleClearGroups = () => {
    if (window.confirm('Delete all saved groups? This cannot be undone.')) {
      setSavedGroups([]);
      localStorage.removeItem('pokerGameGroups');
      alert('Groups deleted');
    }
  };

  const handleSignOut = () => {
    if (window.confirm('Sign out?')) {
      auth.signOut();
      setGameHistory([]);
      setSavedGroups([]);
      navigate('/');
    }
  };

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
            <Settings className="text-[#0A0E14]" size={24} />
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <PremiumCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-[#D4AF37]" size={20} />
              <h3 className="text-lg font-semibold text-[#F8FAFC]">Profile Settings</h3>
            </div>

            <div className="space-y-4">
              <PremiumInput
                label="Display Name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />

              <PremiumInput
                label="Venmo Username (Optional)"
                type="text"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                placeholder="@yourvenmo"
              />

              <div className="text-xs text-[#64748B]">
                Email: {user?.email}
              </div>

              <PrimaryButton onClick={handleUpdateProfile}>
                Save Profile
              </PrimaryButton>
            </div>
          </PremiumCard>

          {/* Preferences */}
          <PremiumCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="text-[#D4AF37]" size={20} />
              <h3 className="text-lg font-semibold text-[#F8FAFC]">Preferences</h3>
            </div>

            <div className="space-y-4">
              {/* Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#12161F] rounded-xl">
                <div className="flex items-center gap-3">
                  <Bell className="text-[#CBD5E1]" size={20} />
                  <div>
                    <div className="font-medium text-[#F8FAFC]">Notifications</div>
                    <div className="text-xs text-[#64748B]">Get notified about game invites</div>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                    notifications ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942]' : 'bg-[#64748B]'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                      notifications ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#12161F] rounded-xl">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <div>
                    <div className="font-medium text-[#F8FAFC]">Sound Effects</div>
                    <div className="text-xs text-[#64748B]">Play sounds for actions</div>
                  </div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                    soundEnabled ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942]' : 'bg-[#64748B]'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#12161F] rounded-xl">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="text-[#CBD5E1]" size={20} /> : <Sun className="text-[#CBD5E1]" size={20} />}
                  <div>
                    <div className="font-medium text-[#F8FAFC]">Dark Mode</div>
                    <div className="text-xs text-[#64748B]">Currently in dark mode</div>
                  </div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                    darkMode ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942]' : 'bg-[#64748B]'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                      darkMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </PremiumCard>

          {/* Data Management */}
          <PremiumCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-[#D4AF37]" size={20} />
              <h3 className="text-lg font-semibold text-[#F8FAFC]">Data Management</h3>
            </div>

            <div className="space-y-3">
              <SecondaryButton icon={Trash2} onClick={handleClearHistory}>
                Clear Game History
              </SecondaryButton>

              <SecondaryButton icon={Trash2} onClick={handleClearGroups}>
                Delete Saved Groups
              </SecondaryButton>
            </div>
          </PremiumCard>

          {/* Account Actions */}
          <PremiumCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <LogOut className="text-[#EF4444]" size={20} />
              <h3 className="text-lg font-semibold text-[#F8FAFC]">Account</h3>
            </div>

            <DangerButton icon={LogOut} onClick={handleSignOut}>
              Sign Out
            </DangerButton>
          </PremiumCard>

          {/* App Info */}
          <PremiumCard className="p-6 text-center">
            <div className="text-sm text-[#64748B]">
              <p className="mb-1">Cashout - Poker Settlement</p>
              <p className="text-xs">Version 1.0.0</p>
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
