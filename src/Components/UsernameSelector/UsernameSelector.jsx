import {User} from "lucide-react";
import React from "react";

const UsernameSelector = ({
                          existingUsers,
                          selectedUser,
                          setSelectedUser,
                          setMode,
                          isSubmitting
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
        </div>
    )
}

export default UsernameSelector;
