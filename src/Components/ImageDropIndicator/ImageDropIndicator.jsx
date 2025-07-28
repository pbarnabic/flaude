import React from 'react';
import {Check} from 'lucide-react';

const ImageDropIndicator = ({isVisible, message = "Images added! They'll be sent with your next message."}) => {
    if (!isVisible) return null;

    return (
        <div
            className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right duration-300 z-50">
            <Check className="w-4 h-4"/>
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
};

export default ImageDropIndicator;
