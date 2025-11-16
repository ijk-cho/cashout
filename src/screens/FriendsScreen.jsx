import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Check, X, UserMinus, Send } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import {
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  PremiumCard,
  PremiumInput,
} from '../components/PremiumUI';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  cancelFriendRequest,
} from '../friendService';

const FriendsScreen = () => {
  const navigate = useNavigate();
  const { friends, pendingRequests, sentRequests } = useGame();
  const [friendEmail, setFriendEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'pending', 'sent'

  const handleBack = () => {
    navigate('/');
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!friendEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await sendFriendRequest(friendEmail.trim());
      setSuccess('Friend request sent!');
      setFriendEmail('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send friend request');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendId) => {
    try {
      await acceptFriendRequest(friendId);
      setSuccess('Friend request accepted!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to accept request');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleRejectRequest = async (friendId) => {
    try {
      await rejectFriendRequest(friendId);
    } catch (err) {
      setError(err.message || 'Failed to reject request');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleRemoveFriend = async (friendId, friendName) => {
    if (window.confirm(`Remove ${friendName} from your friends?`)) {
      try {
        await removeFriend(friendId);
        setSuccess('Friend removed');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message || 'Failed to remove friend');
        setTimeout(() => setError(''), 5000);
      }
    }
  };

  const handleCancelRequest = async (friendId) => {
    try {
      await cancelFriendRequest(friendId);
    } catch (err) {
      setError(err.message || 'Failed to cancel request');
      setTimeout(() => setError(''), 5000);
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
            <Users className="text-[#0A0E14]" size={24} />
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">Friends</h2>
        </div>

        {/* Add Friend Form */}
        <PremiumCard className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Add Friend</h3>
          <form onSubmit={handleSendRequest} className="space-y-4">
            <PremiumInput
              label="Friend's Email"
              type="email"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              placeholder="friend@example.com"
              disabled={loading}
            />

            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-3 text-[#EF4444] text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-3 text-[#10B981] text-sm">
                {success}
              </div>
            )}

            <PrimaryButton
              type="submit"
              icon={Send}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Friend Request'}
            </PrimaryButton>
          </form>
        </PremiumCard>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            <Users size={16} />
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 relative ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            <UserPlus size={16} />
            Pending ({pendingRequests.length})
            {pendingRequests.length > 0 && activeTab !== 'pending' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'sent'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14]'
                : 'bg-[#1E2433] text-[#CBD5E1] border border-white/10 hover:border-[#D4AF37]/50'
            }`}
          >
            <Send size={16} />
            Sent ({sentRequests.length})
          </button>
        </div>

        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <PremiumCard className="p-12 text-center">
                <Users className="mx-auto mb-4 text-[#64748B]" size={48} />
                <p className="text-[#64748B] text-lg mb-2">No friends yet</p>
                <p className="text-[#64748B] text-sm">Add friends to play together!</p>
              </PremiumCard>
            ) : (
              friends.map((friend) => (
                <PremiumCard key={friend.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-full flex items-center justify-center font-bold text-[#0A0E14]">
                        {friend.displayName ? friend.displayName[0].toUpperCase() : friend.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#F8FAFC]">
                          {friend.displayName || 'Player'}
                        </div>
                        <div className="text-sm text-[#64748B]">{friend.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.id, friend.displayName || friend.email)}
                      className="text-[#64748B] hover:text-[#EF4444] p-2 rounded-lg hover:bg-[#EF4444]/10 transition-all duration-200"
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                </PremiumCard>
              ))
            )}
          </div>
        )}

        {/* Pending Requests */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <PremiumCard className="p-12 text-center">
                <UserPlus className="mx-auto mb-4 text-[#64748B]" size={48} />
                <p className="text-[#64748B] text-lg">No pending requests</p>
              </PremiumCard>
            ) : (
              pendingRequests.map((request) => (
                <PremiumCard key={request.id} className="p-5 border-[#D4AF37]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-full flex items-center justify-center font-bold text-[#0A0E14]">
                        {request.displayName ? request.displayName[0].toUpperCase() : request.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#F8FAFC]">
                          {request.displayName || 'Player'}
                        </div>
                        <div className="text-sm text-[#64748B]">{request.email}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14] p-2 rounded-lg hover:shadow-lg transition-all duration-200"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="text-[#EF4444] hover:bg-[#EF4444]/10 p-2 rounded-lg transition-all duration-200"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </PremiumCard>
              ))
            )}
          </div>
        )}

        {/* Sent Requests */}
        {activeTab === 'sent' && (
          <div className="space-y-3">
            {sentRequests.length === 0 ? (
              <PremiumCard className="p-12 text-center">
                <Send className="mx-auto mb-4 text-[#64748B]" size={48} />
                <p className="text-[#64748B] text-lg">No sent requests</p>
              </PremiumCard>
            ) : (
              sentRequests.map((request) => (
                <PremiumCard key={request.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#64748B] to-[#475569] rounded-full flex items-center justify-center font-bold text-[#F8FAFC]">
                        {request.displayName ? request.displayName[0].toUpperCase() : request.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#F8FAFC]">
                          {request.displayName || 'Player'}
                        </div>
                        <div className="text-sm text-[#64748B]">{request.email}</div>
                        <div className="text-xs text-[#D4AF37] mt-1">Pending...</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="text-[#64748B] hover:text-[#EF4444] p-2 rounded-lg hover:bg-[#EF4444]/10 transition-all duration-200"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </PremiumCard>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsScreen;
