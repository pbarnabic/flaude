import React, { useState, useEffect } from 'react';
import { MODELS } from "../../Constants/Models.js";
import { DEFAULT_RATE_LIMITS } from "../../Utils/RateLimiter.js";

const ModelSettings = ({
                           showSettings,
                           setShowSettings,
                           modelSettings,
                           setModelSettings,
                           showDebugInfo,
                           setShowDebugInfo,
                           rateLimits,
                           setRateLimits
                       }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [currentLimits, setCurrentLimits] = useState({});

    useEffect(() => {
        // Initialize current limits when model changes
        const modelDefaults = DEFAULT_RATE_LIMITS[modelSettings.model] || {
            requestsPerMinute: 50,
            inputTokensPerMinute: 20000,
            outputTokensPerMinute: 4000
        };

        setCurrentLimits(rateLimits[modelSettings.model] || modelDefaults);
    }, [modelSettings.model, rateLimits]);

    const handleSave = () => {
        // Save the current limits for the selected model
        setRateLimits(prev => ({
            ...prev,
            [modelSettings.model]: currentLimits
        }));
        setShowSettings(false);
    };

    const handleCancel = () => {
        // Reset to saved values
        const modelDefaults = DEFAULT_RATE_LIMITS[modelSettings.model] || {};
        setCurrentLimits(rateLimits[modelSettings.model] || modelDefaults);
        setShowSettings(false);
    };

    if (!showSettings) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Model Settings</h2>

                    {/* Model Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Model</label>
                        <select
                            value={modelSettings.model}
                            onChange={(e) => setModelSettings(prev => ({...prev, model: e.target.value}))}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {Object.entries(MODELS).map(([value, label]) => (
                                <option key={value} value={value}>{`Claude ${label}`}</option>
                            ))}
                        </select>
                    </div>

                    {/* Temperature */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Temperature: {modelSettings.temperature}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={modelSettings.temperature}
                            onChange={(e) => setModelSettings(prev => ({
                                ...prev,
                                temperature: parseFloat(e.target.value)
                            }))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Conservative</span>
                            <span>Creative</span>
                        </div>
                    </div>

                    {/* Max Tokens */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Max Tokens</label>
                        <input
                            type="number"
                            min="1"
                            max="8192"
                            value={modelSettings.maxTokens}
                            onChange={(e) => setModelSettings(prev => ({...prev, maxTokens: parseInt(e.target.value)}))}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Rate Limits Section */}
                    <div className="mb-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <span className="text-sm font-medium text-slate-700">Rate Limits</span>
                            <svg
                                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showAdvanced && (
                            <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Requests Per Minute
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={currentLimits.requestsPerMinute || 50}
                                        onChange={(e) => setCurrentLimits(prev => ({
                                            ...prev,
                                            requestsPerMinute: parseInt(e.target.value)
                                        }))}
                                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Input Tokens Per Minute
                                    </label>
                                    <input
                                        type="number"
                                        min="1000"
                                        max="100000"
                                        value={currentLimits.inputTokensPerMinute || 20000}
                                        onChange={(e) => setCurrentLimits(prev => ({
                                            ...prev,
                                            inputTokensPerMinute: parseInt(e.target.value)
                                        }))}
                                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Output Tokens Per Minute
                                    </label>
                                    <input
                                        type="number"
                                        min="1000"
                                        max="50000"
                                        value={currentLimits.outputTokensPerMinute || 4000}
                                        onChange={(e) => setCurrentLimits(prev => ({
                                            ...prev,
                                            outputTokensPerMinute: parseInt(e.target.value)
                                        }))}
                                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        const defaults = DEFAULT_RATE_LIMITS[modelSettings.model];
                                        if (defaults) setCurrentLimits(defaults);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    Reset to defaults
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Debug Toggle */}
                    <div className="mb-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showDebugInfo}
                                onChange={(e) => setShowDebugInfo(e.target.checked)}
                                className="sr-only"
                            />
                            <div className="relative">
                                <div className={`w-10 h-6 rounded-full transition-colors ${
                                    showDebugInfo ? 'bg-blue-600' : 'bg-slate-300'
                                }`}>
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                        showDebugInfo ? 'translate-x-4' : 'translate-x-0'
                                    }`}></div>
                                </div>
                            </div>
                            <span className="ml-3 text-sm font-medium text-slate-700">
                                Show Debug Information
                            </span>
                        </label>
                        <p className="text-xs text-slate-500 mt-1 ml-13">
                            Display technical details about API requests and responses
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelSettings;
