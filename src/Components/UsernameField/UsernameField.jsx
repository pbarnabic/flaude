import React from 'react';
import {User} from 'lucide-react';

const UsernameField = ({username, setUsername, isSubmitting}) => {
    return (
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
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"/>
            </div>
            {username && (
                <p className="mt-1 text-xs text-gray-500">
                    Letters, numbers, hyphens, and underscores only
                </p>
            )}
        </div>
    );
};

export default UsernameField;
