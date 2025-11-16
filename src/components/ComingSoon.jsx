import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from './PremiumUI';

const ComingSoon = ({ screenName }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-8 text-center border border-white/10">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold text-[#F8FAFC] mb-3">
          {screenName || 'This Screen'} - Coming Soon
        </h2>
        <p className="text-[#CBD5E1] mb-6">
          This screen is being refactored and will be available soon.
        </p>
        <PrimaryButton onClick={() => navigate('/')}>
          Go Home
        </PrimaryButton>
      </div>
    </div>
  );
};

export default ComingSoon;
