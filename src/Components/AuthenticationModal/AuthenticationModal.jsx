import React, {useEffect, useState} from 'react';
import UserSelectionMode from '../UserSelectionMode/UserSelectionMode.jsx';
import LoginMode from '../LoginMode/LoginMode.jsx';
import SignupMode from '../SignupMode/SignupMode.jsx';
import DeleteUserModal from '../DeleteUserModal/DeleteUserModal.jsx';
import SecurityNote from '../SecurityNote/SecurityNote.jsx';
import ErrorMessage from '../ErrorMessage/ErrorMessage.jsx';
import {useAuthentication} from '../../Contexts/AuthenticationContext.jsx';
import {
    CACHED_USERNAME_KEY,
    GUEST_PASSWORD,
    GUEST_USERNAME,
    USERNAME_QUERY_PARAM
} from "../../Constants/AuthConstants.js";

const AuthenticationModal = () => {
    const {
        isAuthenticated,
        isLoading,
        existingUsers,
        setupUser,
        authenticateUser,
        deleteUser,
    } = useAuthentication();

    const [mode, setMode] = useState('select');
    const [selectedUser, setSelectedUser] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Check for query params and handle guest login
    useEffect(() => {
        if (!isLoading) {
            const urlParams = new URLSearchParams(window.location.search);
            let usernameParam = urlParams.get(USERNAME_QUERY_PARAM);

            if (!usernameParam) {
                usernameParam = localStorage.getItem(CACHED_USERNAME_KEY);
            }

            if (usernameParam) {
                if (usernameParam === GUEST_USERNAME) {
                    // Auto-login as guest
                    handleGuestLogin();
                } else {
                    // Skip to password step for the specified user
                    setSelectedUser(usernameParam);
                    setMode('login');
                }
            } else {
                // No username found, determine mode based on existing users
                // if (existingUsers.length === 0) {
                //     setMode('signup');
                // } else {
                    setMode('select');
                // }
            }
        }
    }, [isLoading, existingUsers]);

    // Clear query params when user goes back to selection
    const handleBackToSelection = () => {
        // Clear the URL parameter when going back
        const url = new URL(window.location);
        url.searchParams.delete('username');
        localStorage.removeItem(CACHED_USERNAME_KEY);
        window.history.replaceState({}, '', url);

        setSelectedUser('');
        setMode('select');
    };

    const handleGuestLogin = async () => {
        setError('');
        setIsSubmitting(true);

        try {
            // Use hardcoded guest credentials
            await authenticateUser(GUEST_USERNAME, GUEST_PASSWORD);
            localStorage.setItem(CACHED_USERNAME_KEY, GUEST_USERNAME);
        } catch (err) {
            setError(err.message || 'Guest authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogin = async (password) => {
        setError('');
        setIsSubmitting(true);

        try {
            const userToLogin = selectedUser;
            if (!userToLogin) {
                throw new Error('No user selected');
            }
            await authenticateUser(userToLogin, password);
            localStorage.setItem(CACHED_USERNAME_KEY, userToLogin);
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignup = async (username, password) => {
        setError('');
        setIsSubmitting(true);

        try {
            await setupUser(username, password);
            localStorage.setItem(CACHED_USERNAME_KEY, username);
        } catch (err) {
            setError(err.message || 'User creation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (username) => {
        setError('');
        setIsSubmitting(true);

        try {
            await deleteUser(username);
            setShowDeleteConfirm(null);
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

    const commonProps = {
        error,
        setError,
        isSubmitting,
        setMode
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <ErrorMessage error={error}/>

                {mode === 'select' && (
                    <UserSelectionMode
                        existingUsers={existingUsers}
                        selectedUser={selectedUser}
                        setSelectedUser={setSelectedUser}
                        setShowDeleteConfirm={setShowDeleteConfirm}
                        onGuestLogin={handleGuestLogin}
                        {...commonProps}
                    />
                )}

                {mode === 'login' && (
                    <LoginMode
                        selectedUser={selectedUser}
                        onLogin={handleLogin}
                        isGuest={selectedUser === GUEST_USERNAME}
                        onBackToSelection={handleBackToSelection}
                        {...commonProps}
                    />
                )}

                {mode === 'signup' && (
                    <SignupMode
                        existingUsers={existingUsers}
                        onSignup={handleSignup}
                        {...commonProps}
                    />
                )}

                {showDeleteConfirm && (
                    <DeleteUserModal
                        username={showDeleteConfirm}
                        onDelete={handleDeleteUser}
                        onCancel={() => setShowDeleteConfirm(null)}
                        isSubmitting={isSubmitting}
                    />
                )}

                <SecurityNote/>
            </div>
        </div>
    );
};

export default AuthenticationModal;
