import React, {useState} from 'react';
import {Eye, EyeOff, CheckCircle} from 'lucide-react';

const PasswordField = ({
                           label,
                           value,
                           onChange,
                           placeholder,
                           showValidation = false,
                           isSubmitting
                       }) => {
    const [showPassword, setShowPassword] = useState(false);

    const validationChecks = [
        {
            test: value.length >= 8,
            label: 'At least 8 characters'
        },
        {
            test: /(?=.*[a-z])(?=.*[A-Z])/.test(value),
            label: 'Upper & lowercase letters'
        },
        {
            test: /(?=.*\d)/.test(value),
            label: 'At least one number'
        }
    ];

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={placeholder}
                    required
                    disabled={isSubmitting}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
            </div>
            {showValidation && value && (
                <div className="mt-2 space-y-1">
                    {validationChecks.map((check, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                            {check.test ? (
                                <CheckCircle className="w-3 h-3 text-green-600"/>
                            ) : (
                                <div className="w-3 h-3 rounded-full border border-gray-300"/>
                            )}
                            <span className={check.test ? 'text-green-600' : 'text-gray-500'}>
                                {check.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PasswordField;
