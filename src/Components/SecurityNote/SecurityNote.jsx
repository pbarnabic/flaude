import React from 'react';
import {Shield} from 'lucide-react';

const SecurityNote = () => {
    return (
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"/>
                <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Secure Multi-User Support</p>
                    <p>
                        Each user gets their own encrypted database stored within the browser.
                        Your data is completely isolated and encrypted with AES-256-GCM.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SecurityNote;
