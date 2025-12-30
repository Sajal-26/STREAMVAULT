import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { USE_MOCK_BACKEND } from '../constants';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  
  // State for Signup Steps
  // Step 0: Login (isLogin=true)
  // Step 1: Signup - Enter Email
  // Step 2: Signup - Verify OTP & Set Password
  const [signupStep, setSignupStep] = useState(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup, sendOtp } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        await login(email, password);
        navigate('/profiles');
    } catch (err: any) {
        setError(err.message || "Login failed");
    } finally {
        setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
          await sendOtp(email);
          if (USE_MOCK_BACKEND) {
              setSuccessMsg(`OTP sent (Check alert or console)`);
          } else {
              setSuccessMsg(`OTP sent to ${email}`);
          }
          setSignupStep(2);
      } catch (err: any) {
          setError(err.message || "Failed to send OTP");
      } finally {
          setLoading(false);
      }
  };

  const handleSignupComplete = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
          await signup(email, password, otp);
          navigate('/profiles');
      } catch (err: any) {
          setError(err.message || "Signup failed");
      } finally {
          setLoading(false);
      }
  };

  const toggleMode = () => {
      setIsLogin(!isLogin);
      setError('');
      setSuccessMsg('');
      setSignupStep(1); // Reset step
      setOtp('');
      setPassword('');
  };

  return (
    <div className="min-h-screen w-full relative bg-black flex items-center justify-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
         <img 
            src="https://assets.nflxext.com/ffe/siteui/vlv3/f841d4c7-10e1-40af-bcae-07a3f8dc141a/f6d7434e-d6de-4185-a6d4-c77a2d08737b/US-en-20220502-popsignuptwoweeks-perspective_alpha_website_medium.jpg" 
            alt="Background" 
            className="w-full h-full object-cover opacity-50"
         />
         <div className="absolute inset-0 bg-black/60 md:bg-black/50" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 md:p-16 bg-black/75 backdrop-blur-sm rounded-lg shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-8">
            {isLogin ? 'Sign In' : (signupStep === 1 ? 'Get Started' : 'Finish Sign Up')}
        </h1>
        
        {error && <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded mb-4 text-sm">{error}</div>}
        {successMsg && <div className="bg-green-500/20 border border-green-500 text-green-100 p-3 rounded mb-4 text-sm">{successMsg}</div>}

        {isLogin ? (
            // LOGIN FORM
            <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                    <input
                        type="email"
                        placeholder="Email or phone number"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-5 py-4 bg-[#333] rounded text-white placeholder-gray-400 focus:outline-none focus:bg-[#454545] transition"
                        required
                    />
                </div>
                <div>
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-5 py-4 bg-[#333] rounded text-white placeholder-gray-400 focus:outline-none focus:bg-[#454545] transition"
                        required
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-brand-primary text-white font-bold rounded hover:opacity-90 transition duration-200 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Sign In'}
                </button>
                
                <div className="flex justify-between items-center text-sm text-gray-400">
                    <label className="flex items-center space-x-1 cursor-pointer">
                    <input type="checkbox" className="rounded bg-[#333] border-none focus:ring-0" />
                    <span>Remember me</span>
                    </label>
                    <button type="button" className="hover:underline">Need help?</button>
                </div>
            </form>
        ) : (
            // SIGNUP FLOW
            <>
                {signupStep === 1 && (
                    <form onSubmit={handleSendOtp} className="space-y-6">
                        <div>
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-4 bg-[#333] rounded text-white placeholder-gray-400 focus:outline-none focus:bg-[#454545] transition"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-brand-primary text-white font-bold rounded hover:opacity-90 transition duration-200 disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? 'Sending...' : <>Get OTP <ChevronRight className="w-5 h-5 ml-1" /></>}
                        </button>
                    </form>
                )}

                {signupStep === 2 && (
                    <form onSubmit={handleSignupComplete} className="space-y-6">
                        <div className="flex items-center justify-between text-gray-400 text-sm mb-2">
                             <span>Sent to: {email}</span>
                             <button type="button" onClick={() => setSignupStep(1)} className="hover:text-white hover:underline flex items-center"><ArrowLeft className="w-3 h-3 mr-1"/> Edit</button>
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-5 py-4 bg-[#333] rounded text-white placeholder-gray-400 focus:outline-none focus:bg-[#454545] transition text-center tracking-widest text-xl"
                                required
                                maxLength={6}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="Create Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-[#333] rounded text-white placeholder-gray-400 focus:outline-none focus:bg-[#454545] transition"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-brand-primary text-white font-bold rounded hover:opacity-90 transition duration-200 disabled:opacity-50"
                        >
                            {loading ? 'Creating Account...' : 'Start Membership'}
                        </button>
                    </form>
                )}
            </>
        )}

        <div className="mt-16 text-gray-400">
            {isLogin ? "New to StreamVault? " : "Already have an account? "}
            <button onClick={toggleMode} className="text-white hover:underline font-medium">
                {isLogin ? "Sign up now" : "Sign in"}
            </button>
            .
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
            This page is protected by Google reCAPTCHA to ensure you're not a bot.
        </div>
      </div>
    </div>
  );
};

export default Login;