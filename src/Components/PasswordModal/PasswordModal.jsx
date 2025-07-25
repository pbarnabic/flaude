// ./Components/PasswordModal/PasswordModal.jsx
import React, {useState, useEffect} from 'react';
import {Eye, EyeOff, Lock, Shield, AlertCircle, CheckCircle, User, Users, Trash2, UserPlus} from 'lucide-react';
import {usePassword} from '../../Contexts/PasswordContext.jsx';

const PasswordModal = () => {
    const {
        isAuthenticated,
        isLoading,
        currentUsername,
        existingUsers,
        setupUser,
        authenticateUser,
        deleteUser,
        switchUser
    } = usePassword();

    const [mode, setMode] = useState('select'); // 'select', 'login', 'signup'
    const [selectedUser, setSelectedUser] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Determine initial mode based on existing users
    useEffect(() => {
        if (!isLoading) {
            if (existingUsers.length === 0) {
                setMode('signup');
            } else {
                setMode('select');
            }
        }
    }, [isLoading, existingUsers]);

    const validateUsername = (user) => {
        if (user.length < 2) {
            return 'Username must be at least 2 characters long';
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(user)) {
            return 'Username can only contain letters, numbers, hyphens, and underscores';
        }
        return '';
    };

    const validatePassword = (pwd) => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/(?=.*[a-z])/.test(pwd)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/(?=.*[A-Z])/.test(pwd)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/(?=.*\d)/.test(pwd)) {
            return 'Password must contain at least one number';
        }
        return '';
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // When in login mode after selecting a user, use selectedUser
            // When in signup mode, use the username field
            const userToLogin = selectedUser || username;

            if (!userToLogin) {
                throw new Error('No user selected or entered');
            }

            await authenticateUser(userToLogin, password);

            // Clear form
            setPassword('');
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const usernameError = validateUsername(username);
            if (usernameError) {
                setError(usernameError);
                return;
            }

            const passwordError = validatePassword(password);
            if (passwordError) {
                setError(passwordError);
                return;
            }

            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            await setupUser(username, password);

            // Clear form
            setUsername('');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.message || 'User creation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async () => {
        setError('');
        setIsSubmitting(true);

        try {
            await deleteUser(currentUsername);
        } catch (err) {
            setError(err.message || 'Account deletion failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Don't show modal if already authenticated
    if (isAuthenticated || isLoading) {
        return null;
    }

    return (

        <div className="fixed inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                {/* Header */}
                <div className="text-center mb-6">
                    <div
                        className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                        {mode === 'select' ? <Users className="w-8 h-8 text-white"/> :
                            mode === 'signup' ? <UserPlus className="w-8 h-8 text-white"/> :
                                <User className="w-8 h-8 text-white"/>}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {mode === 'select' ? 'Select User' :
                            mode === 'signup' ? 'Create Account' :
                                'Sign In'}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        {mode === 'select' ? 'Choose your account or create a new one' :
                            mode === 'signup' ? 'Set up your encrypted account' :
                                `Sign in as ${selectedUser || username}`}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                )}

                {/* User Selection Mode */}
                {mode === 'select' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Existing Users
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {existingUsers.map((user) => (
                                    <div
                                        key={user}
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                                            selectedUser === user
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-500"/>
                                            <span className="font-medium">{user}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => selectedUser && setMode('login')}
                                disabled={!selectedUser || isSubmitting}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setMode('signup')}
                                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all"
                            >
                                New User
                            </button>
                        </div>
                    </div>
                )}

                {/* Login Mode */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
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
                )}

                {/* Signup Mode */}
                {mode === 'signup' && (
                    <form onSubmit={handleSignup} className="space-y-4">
                        {/* Username Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter a username"
                                    required
                                    disabled={isSubmitting}
                                    maxLength={50}
                                />
                                <User
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"/>
                            </div>
                            {username && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Letters, numbers, hyphens, and underscores only
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Create a strong password"
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
                            {password && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center gap-2 text-xs">
                                        {password.length >= 8 ?
                                            <CheckCircle className="w-3 h-3 text-green-600"/> :
                                            <div className="w-3 h-3 rounded-full border border-gray-300"/>
                                        }
                                        <span className={password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                                            At least 8 characters
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {/(?=.*[a-z])(?=.*[A-Z])/.test(password) ?
                                            <CheckCircle className="w-3 h-3 text-green-600"/> :
                                            <div className="w-3 h-3 rounded-full border border-gray-300"/>
                                        }
                                        <span
                                            className={/(?=.*[a-z])(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                                            Upper & lowercase letters
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {/(?=.*\d)/.test(password) ?
                                            <CheckCircle className="w-3 h-3 text-green-600"/> :
                                            <div className="w-3 h-3 rounded-full border border-gray-300"/>
                                        }
                                        <span
                                            className={/(?=.*\d)/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                                            At least one number
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Confirm your password"
                                    required
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {existingUsers.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setMode('select')}
                                    className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all"
                                    disabled={isSubmitting}
                                >
                                    Back
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting || !username || !password || !confirmPassword}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div
                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                        Creating...
                                    </div>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4 inline mr-2"/>
                                        Create Account
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Delete User Confirmation */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                            <div className="text-center">
                                <div
                                    className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <Trash2 className="w-6 h-6 text-red-600"/>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Delete User
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Are you sure you want to delete <strong>{showDeleteConfirm}</strong>?
                                    This will permanently delete all their chats and data.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(showDeleteConfirm)}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Note */}
                <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"/>
                        <div className="text-xs text-blue-700">
                            <p className="font-medium mb-1">Secure Multi-User Support</p>
                            <p>Each user gets their own encrypted database stored within the browser. Your data is completely isolated and
                                encrypted with AES-256-GCM.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasswordModal;
