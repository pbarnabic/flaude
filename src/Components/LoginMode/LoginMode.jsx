import React, {useState} from 'react';
import {User, Lock, Eye, EyeOff} from 'lucide-react';
import ModalHeader from '../ModalHeader/ModalHeader.jsx';

const LoginMode = ({selectedUser, onLogin, isSubmitting, setMode}) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(password);
    };

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
                        onClick={() => setMode('select')}
                        className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all"
                        disabled={isSubmitting}
                    >
                        Back
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
