import React, {useState} from 'react';
import {UserPlus} from 'lucide-react';
import {validateUsername, validatePassword} from "../../Utils/AuthenticationUtils.js";
import ModalHeader from '../ModalHeader/ModalHeader.jsx';
import PasswordField from '../PasswordField/PasswordField.jsx';
import UsernameField from '../UsernameField/UsernameField.jsx';

const SignupMode = ({existingUsers, onSignup, isSubmitting, setMode, setError}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

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

        onSignup(username, password);
    };

    return (
        <>
            <ModalHeader
                icon={<UserPlus className="w-8 h-8 text-white"/>}
                title="Create Account"
                subtitle="Set up your encrypted account"
            />

            <form onSubmit={handleSubmit} className="space-y-4">
                <UsernameField
                    username={username}
                    setUsername={setUsername}
                    isSubmitting={isSubmitting}
                />

                <PasswordField
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Create a strong password"
                    showValidation={true}
                    isSubmitting={isSubmitting}
                />

                <PasswordField
                    label="Confirm Password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm your password"
                    showValidation={false}
                    isSubmitting={isSubmitting}
                />

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
        </>
    );
};

export default SignupMode;
