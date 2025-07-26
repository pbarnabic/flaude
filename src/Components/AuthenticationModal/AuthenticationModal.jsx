import React, {useEffect, useState} from 'react';
import UserSelectionMode from '../UserSelectionMode/UserSelectionMode.jsx';
import LoginMode from '../LoginMode/LoginMode.jsx';
import SignupMode from '../SignupMode/SignupMode.jsx';
import DeleteUserModal from '../DeleteUserModal/DeleteUserModal.jsx';
import SecurityNote from '../SecurityNote/SecurityNote.jsx';
import ErrorMessage from '../ErrorMessage/ErrorMessage.jsx';
import {useAuthentication} from '../../Contexts/AuthenticationContext.jsx';

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

    const handleLogin = async (password) => {
        console.log('handleLogin called with selectedUser:', selectedUser);
        setError('');
        setIsSubmitting(true);

        try {
            const userToLogin = selectedUser;
            if (!userToLogin) {
                throw new Error('No user selected');
            }
            await authenticateUser(userToLogin, password);
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
                        {...commonProps}
                    />
                )}

                {mode === 'login' && (
                    <LoginMode
                        selectedUser={selectedUser}
                        onLogin={handleLogin}
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
