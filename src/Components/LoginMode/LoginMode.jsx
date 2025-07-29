
import React, {useState, useEffect} from 'react';
import {User, Lock, Eye, EyeOff, UserCheck} from 'lucide-react';
import ModalHeader from '../ModalHeader/ModalHeader.jsx';
import {GUEST_PASSWORD} from "../../Constants/AuthConstants.js";

const LoginMode = ({selectedUser, onLogin, isSubmitting, setMode, isGuest, onBackToSelection}) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Auto-login for guest users
    useEffect(() => {
        if (isGuest) {
            setPassword(GUEST_PASSWORD);
            // Auto-submit after a brief delay to show the UI
            const timer = setTimeout(() => {
                onLogin(GUEST_PASSWORD);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isGuest, onLogin]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(password);
    };

    // For guest users, show a simplified view
    if (isGuest) {
        return (
            <>
                <ModalHeader
                    icon={<UserCheck className="w-8 h-8 text-white"/>}
                    title="Guest Access"
                    subtitle="Signing you in as a guest user"
                />

                <div className="space-y-4">
                    <div className="text-center py-8">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
                        <p className="text-gray-600">Setting up guest session...</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Guest sessions have limited features and data is not persisted
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onBackToSelection}
                        className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all"
                        disabled={isSubmitting}
                    >
                        Back to User Selection
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <ModalHeader
                icon={<User className="w-8 h-8 text-white"/>}
                title="Sign In"
                subtitle={`Sign in as ${selectedUser}`}
            />

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password for {selectedUser}
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your password"
                            required
                            disabled={isSubmitting}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onBackToSelection}
                        className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all"
                        disabled={isSubmitting}
                    >
                        Back to User Selection
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !password}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <div
                                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                Signing in...
                            </div>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 inline mr-2"/>
                                Sign In
                            </>
                        )}
                    </button>
                </div>
            </form>
        </>
    );
};

export default LoginMode;
