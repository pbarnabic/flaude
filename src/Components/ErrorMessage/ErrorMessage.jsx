import React from 'react';
import {AlertCircle} from 'lucide-react';

const ErrorMessage = ({error}) => {
    if (!error) return null;

    return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
            <span className="text-sm text-red-700">{error}</span>
        </div>
    );
};

export default ErrorMessage;
