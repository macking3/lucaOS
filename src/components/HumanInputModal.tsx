// HumanInputModal - Modal for agent to request user input (credentials, etc.)
import React, { useState, useEffect } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  prompt: string;
  sessionId: string;
  onClose: () => void;
  onSubmit: (input: string) => void;
  isPassword?: boolean;
  isSavePrompt?: boolean;
}

const HumanInputModal: React.FC<Props> = ({ 
  isOpen, 
  prompt, 
  sessionId, 
  onClose, 
  onSubmit,
  isPassword = false,
  isSavePrompt = false
}) => {
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setUsername('');
      setPassword('');
    }
  }, [isOpen, prompt]);

  const handleSubmit = () => {
    if (isSavePrompt) {
      // For save prompts, just submit yes/no
      onSubmit(input.toLowerCase().includes('yes') || input.toLowerCase().includes('y') ? 'yes' : 'no');
    } else if (username && password) {
      // For credential prompts, format as "username:password"
      onSubmit(`${username}:${password}`);
    } else if (input.trim()) {
      // For other prompts, submit as-is
      onSubmit(input.trim());
    }
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  // Check if prompt is asking for credentials
  const isCredentialPrompt = prompt.toLowerCase().includes('email') || 
                             prompt.toLowerCase().includes('username') || 
                             prompt.toLowerCase().includes('password') ||
                             prompt.toLowerCase().includes('login');

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border border-cyan-500/30 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-cyan-900/50 bg-cyan-950/10 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {isPassword || isCredentialPrompt ? (
              <Lock size={18} className="text-cyan-400" />
            ) : (
              <AlertCircle size={18} className="text-cyan-400" />
            )}
            <span className="text-cyan-400 text-sm font-bold tracking-wider">AGENT REQUEST</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Prompt */}
          <div className="text-sm text-slate-300 font-mono leading-relaxed">
            {prompt}
          </div>

          {/* Input Fields */}
          {isCredentialPrompt && !isSavePrompt ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-cyan-400 mb-1.5 font-mono">
                  Email / Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 bg-black/40 border border-cyan-900/30 rounded text-white text-sm font-mono outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  placeholder="user@example.com"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-400 mb-1.5 font-mono">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 py-2 bg-black/40 border border-cyan-900/30 rounded text-white text-sm font-mono outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 text-xs font-mono"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 bg-black/40 border border-cyan-900/30 rounded text-white text-sm font-mono outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 resize-none"
                rows={4}
                placeholder="Type your response..."
                autoFocus
              />
            </div>
          )}

          {/* Session Info */}
          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-cyan-900/20">
            Session: {sessionId.substring(0, 12)}...
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-cyan-900/30 bg-[#080808] px-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-white transition-colors font-mono"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCredentialPrompt && !isSavePrompt ? (!username || !password) : !input.trim()}
            className="px-4 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded transition-colors font-mono disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SUBMIT
          </button>
        </div>
      </div>
    </div>
  );
};

export default HumanInputModal;

