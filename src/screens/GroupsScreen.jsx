import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import {
  PrimaryButton,
  GhostButton,
  PremiumCard,
  PremiumInput,
} from '../components/PremiumUI';

const GroupsScreen = () => {
  const navigate = useNavigate();
  const { savedGroups, setSavedGroups, setPlayers, setSessionName } = useGame();
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleBack = () => {
    navigate('/');
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    const newGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      players: [],
      createdAt: new Date().toISOString(),
    };

    const updatedGroups = [...savedGroups, newGroup];
    setSavedGroups(updatedGroups);
    localStorage.setItem('pokerGameGroups', JSON.stringify(updatedGroups));
    setNewGroupName('');
    setShowAddForm(false);
  };

  const handleDeleteGroup = (groupId) => {
    if (window.confirm('Delete this group?')) {
      const updatedGroups = savedGroups.filter(g => g.id !== groupId);
      setSavedGroups(updatedGroups);
      localStorage.setItem('pokerGameGroups', JSON.stringify(updatedGroups));
    }
  };

  const handleLoadGroup = (group) => {
    if (group.players && group.players.length > 0) {
      setPlayers(group.players);
      setSessionName(group.name);
      navigate('/host');
    } else {
      alert('This group has no players saved');
    }
  };

  const handleStartEdit = (group) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const handleSaveEdit = (groupId) => {
    if (!editingName.trim()) {
      alert('Group name cannot be empty');
      return;
    }

    const updatedGroups = savedGroups.map(g =>
      g.id === groupId ? { ...g, name: editingName.trim() } : g
    );
    setSavedGroups(updatedGroups);
    localStorage.setItem('pokerGameGroups', JSON.stringify(updatedGroups));
    setEditingGroupId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditingName('');
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

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] rounded-xl flex items-center justify-center">
              <Users className="text-[#0A0E14]" size={24} />
            </div>
            <h2 className="text-3xl font-bold text-[#F8FAFC]">Saved Groups</h2>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14] p-3 rounded-xl hover:shadow-lg transition-all duration-200"
          >
            {showAddForm ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>

        {/* Add Group Form */}
        {showAddForm && (
          <PremiumCard className="p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Create New Group</h3>
            <div className="space-y-4">
              <PremiumInput
                label="Group Name"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Sunday Night Crew"
              />
              <div className="flex gap-3">
                <PrimaryButton onClick={handleAddGroup}>
                  Create Group
                </PrimaryButton>
                <GhostButton onClick={() => {
                  setShowAddForm(false);
                  setNewGroupName('');
                }}>
                  Cancel
                </GhostButton>
              </div>
            </div>
          </PremiumCard>
        )}

        {/* Groups List */}
        {savedGroups.length === 0 ? (
          <PremiumCard className="p-12 text-center">
            <Users className="mx-auto mb-4 text-[#64748B]" size={48} />
            <p className="text-[#64748B] text-lg mb-2">No saved groups yet</p>
            <p className="text-[#64748B] text-sm mb-4">
              Create groups to quickly start games with your regular players
            </p>
            <GhostButton onClick={() => setShowAddForm(true)}>
              Create First Group
            </GhostButton>
          </PremiumCard>
        ) : (
          <div className="space-y-3">
            {savedGroups.map((group) => (
              <PremiumCard key={group.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingGroupId === group.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 bg-[#12161F] text-[#F8FAFC] px-4 py-2 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all duration-200"
                        />
                        <button
                          onClick={() => handleSaveEdit(group.id)}
                          className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14] p-2 rounded-lg hover:shadow-lg transition-all duration-200"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-[#64748B] hover:text-[#EF4444] p-2 rounded-lg hover:bg-[#EF4444]/10 transition-all duration-200"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-[#F8FAFC]">
                            {group.name}
                          </h3>
                        </div>
                        <div className="text-sm text-[#64748B]">
                          {group.players?.length || 0} players
                          {group.createdAt && (
                            <span className="ml-3">
                              Created {new Date(group.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {editingGroupId !== group.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadGroup(group)}
                        className="bg-gradient-to-r from-[#D4AF37] to-[#C9A942] text-[#0A0E14] px-4 py-2 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 text-sm"
                      >
                        Load Group
                      </button>
                      <button
                        onClick={() => handleStartEdit(group)}
                        className="text-[#CBD5E1] hover:text-[#F8FAFC] p-2 rounded-lg hover:bg-white/5 transition-all duration-200"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-[#64748B] hover:text-[#EF4444] p-2 rounded-lg hover:bg-[#EF4444]/10 transition-all duration-200"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </PremiumCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsScreen;
