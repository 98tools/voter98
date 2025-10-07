import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import newLogo from '../assets/new-logo.png';
import '../styles/MainLandingPage.css';
import '../styles/brand.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name, adminKey);
      }
      navigate('/dashboard');
    } catch (error: unknown) {
      let errorMessage = 'An error occurred';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { error?: string } } }).response;
        errorMessage = response?.data?.error || 'An error occurred';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fullpage-container" style={{ background: 'linear-gradient(135deg, var(--brand-rich-gold) 0%, var(--brand-sand) 100%)' }}>
      <section className="hero">
        <div className="hero__waves" />
        
        <div className="relative w-full max-w-md">
          {/* Logo/Brand */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: 'var(--brand-surface)', boxShadow: 'var(--brand-shadow-lg)', border: '2px solid var(--brand-rich-gold)' }}>
              <img src={newLogo} alt="منظومة اقتراع  Logo" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="text-3xl font-bold mb-2 brand-heading" style={{ color: 'var(--brand-carbon)' }}>منظومة اقتراع </h1>
            <p className="brand-text" style={{ color: 'var(--brand-carbon)', opacity: '0.8' }}>
              {isLogin ? 'Welcome back to your voting platform' : 'Join the future of digital voting'}
            </p>
          </div>

          {/* Main form card */}
          <div className="brand-card rounded-3xl p-8 animate-fade-in" style={{ background: 'var(--brand-sand)', boxShadow: 'var(--brand-shadow-xl)', border: '1px solid var(--brand-gold-light)' }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold brand-heading mb-2" style={{ color: 'var(--brand-carbon)' }}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="brand-accent-text">
                {isLogin ? 'Enter your credentials to access your account' : 'Fill in your information to get started'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg animate-slide-in-right" style={{ backgroundColor: 'var(--brand-surface)', borderLeft: '4px solid var(--brand-rich-gold)', border: '1px solid var(--brand-gold-light)' }}>
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--brand-rich-gold)' }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium" style={{ color: 'var(--brand-carbon)' }}>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold brand-text mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="brand-input w-full"
                    placeholder="Enter your full name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold brand-text mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="brand-input w-full"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold brand-text mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="brand-input w-full"
                  placeholder="Enter your password"
                />
              </div>

              {!isLogin && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="adminKey" className="block text-sm font-semibold brand-text">
                      Admin Key (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAdminKey(!showAdminKey)}
                      className="text-xs brand-accent-text hover:opacity-80 font-medium transition-opacity"
                    >
                      {showAdminKey ? 'Hide' : 'Show'} Admin Key
                    </button>
                  </div>
                  {showAdminKey && (
                    <div className="animate-slide-in-right">
                      <input
                        id="adminKey"
                        name="adminKey"
                        type="text"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        className="brand-input w-full"
                        placeholder="Enter FIRST_ADMIN_2025 for admin access"
                      />
                      <p className="mt-2 text-xs p-2 rounded-lg" style={{ backgroundColor: 'var(--brand-surface)', color: 'var(--brand-carbon)', border: '1px solid var(--brand-gold-light)' }}>
                        💡 Enter "FIRST_ADMIN_2025" to create an admin account, or leave empty for a regular user account.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
                style={{ 
                  background: 'linear-gradient(135deg, var(--brand-rich-gold) 0%, var(--brand-gold-light) 100%)', 
                  color: 'var(--brand-carbon)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: 'var(--brand-shadow-md)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--brand-shadow-lg)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--brand-shadow-md)'}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="brand-accent-text hover:opacity-80 font-medium transition-all duration-200"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>

            {/* Quick demo credentials */}
            {isLogin && (
              <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--brand-surface)', borderLeft: '4px solid var(--brand-rich-gold)', border: '1px solid var(--brand-gold-light)' }}>
                <h4 className="text-sm font-semibold brand-accent-text mb-2">Demo Credentials</h4>
                <div className="text-xs brand-text space-y-1">
                  <p><strong>Email:</strong> admin@example.com</p>
                  <p><strong>Password:</strong> password123</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-sm" style={{ color: 'var(--brand-carbon)', opacity: '0.7' }}>
            <p>&copy; 2025 منظومة اقتراع . Secure, transparent, and modern voting platform.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
