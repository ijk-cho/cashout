import React, { useState } from 'react';
import { auth } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { DollarSign } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onAuthSuccess(result.user);
    } catch (error) {
      setError(error.message);
      console.error('Google sign-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        onAuthSuccess(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(result.user);
      }
    } catch (error) {
      setError(error.message);
      console.error('Email auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    onAuthSuccess(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] text-[#F8FAFC] p-6 relative overflow-hidden flex items-center justify-center">
      {/* Subtle Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37] opacity-5 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D4AF37] opacity-5 blur-[120px] rounded-full" />

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 bg-gradient-to-br from-[#D4AF37] to-[#C9A942] shadow-[0_8px_32px_rgba(212,175,55,0.3)]">
            <DollarSign size={40} className="text-[#0A0E14]" strokeWidth={3} />
          </div>
          <h1 className="text-5xl font-serif font-bold mb-2 text-[#D4AF37] tracking-tight">
            CashOut
          </h1>
          <p className="text-[#CBD5E1] text-sm">Track games. Settle debts. Keep it clean.</p>
        </div>

        {/* Auth Card */}
        <div className="bg-gradient-to-br from-[#1E2433] to-[#252B3D] rounded-2xl p-6 mb-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <h2 className="text-2xl font-serif font-bold text-[#D4AF37] text-center mb-6">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>

          {/* Google Sign In */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 text-[#0A0E14] font-semibold py-3 px-6 rounded-xl mb-4 flex items-center justify-center gap-3 transition-all duration-200 shadow-lg disabled:opacity-50 border border-white/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="relative text-center mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative">
              <span className="bg-[#252B3D] px-4 text-sm text-[#CBD5E1]">Or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-[#12161F] text-[#F8FAFC] px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 placeholder:text-[#64748B] transition-all duration-200"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-[#12161F] text-[#F8FAFC] px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 placeholder:text-[#64748B] transition-all duration-200"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#C9A942] hover:shadow-[0_6px_24px_rgba(212,175,55,0.4)] text-[#0A0E14] font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-[0_4px_16px_rgba(212,175,55,0.3)] disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          {/* Toggle Sign Up/In */}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-[#D4AF37] text-sm mt-3 hover:text-[#C9A942] transition-colors duration-200"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {/* Guest Mode */}
        <button
          onClick={continueAsGuest}
          className="w-full bg-[#1E2433] hover:bg-[#252B3D] text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg"
        >
          Continue as Guest (History not saved)
        </button>
      </div>
    </div>
  );
};

export default Auth;