import React from "react";
import {User, UserCheck} from "lucide-react";

const UsernameSelector = ({
                              existingUsers,
                              selectedUser,
                              setSelectedUser,
                              setMode,
                              isSubmitting,
                              onGuestLogin
                          }) => {
    return (
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

            {/* Guest Login Button */}
            <div className="border-t pt-4">
                <button
                    onClick={onGuestLogin}
                    disabled={isSubmitting}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/>
                            Signing in as Guest...
                        </div>
                    ) : (
                        <>
                            <UserCheck className="w-4 h-4"/>
                            Continue as Guest
                        </>
                    )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-1">
                    No account required
                </p>
            </div>
        </div>
    )
}

export default UsernameSelector;
