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
    onAuthSuccess(null); // null = guest mode
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-6 relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }}></div>
      
      <div className="absolute top-10 right-10 text-8xl opacity-5">♠</div>
      <div className="absolute bottom-20 left-10 text-8xl opacity-5">♥</div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4"
               style={{
                 background: 'linear-gradient(145deg, #dc2626, #991b1b)',
                 boxShadow: '0 8px 32px rgba(220, 38, 38, 0.4), inset 0 0 0 4px #fef3c7, inset 0 0 0 8px #dc2626'
               }}>
            <DollarSign size={40} className="text-amber-100" strokeWidth={3} />
          </div>
          <h1 className="text-5xl font-bold mb-2 tracking-tight" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
            CASHOUT
          </h1>
          <p className="text-amber-200/70">Sign in to save your poker history</p>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border-2 border-amber-500/30 mb-4">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition shadow-lg mb-4 disabled:opacity-50"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="relative text-center mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-amber-500/30"></div>
            </div>
            <div className="relative">
              <span className="bg-black/40 px-4 text-sm text-amber-300">Or</span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-green-900/50 text-white px-4 py-3 rounded-lg border border-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-green-900/50 text-white px-4 py-3 rounded-lg border border-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg border-2 border-amber-500/50 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-amber-300 text-sm mt-3 hover:text-amber-200"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <button
          onClick={continueAsGuest}
          className="w-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-amber-300 border border-amber-500/30 py-3 rounded-lg transition font-semibold"
        >
          Continue as Guest (History not saved)
        </button>
      </div>
    </div>
  );
};

export default Auth;