import React from 'react';

const ModalHeader = ({icon, title, subtitle}) => {
    return (
        <div className="text-center mb-6">
            <div
                className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                {icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {title}
            </h2>
            <p className="text-gray-600 text-sm">
                {subtitle}
            </p>
        </div>
    );
};

export default ModalHeader;
