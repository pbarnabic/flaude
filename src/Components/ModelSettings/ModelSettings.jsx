import React, {useEffect, useState} from 'react';
import {MODELS, DEFAULT_RATE_LIMITS} from "../../Constants/Models.js";
import {putModelSettings, getModelSettings} from "../../Requests/ModelSettingsRequests.js";

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
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Initialize current limits when model changes
        const modelDefaults = DEFAULT_RATE_LIMITS[modelSettings.model] || {
            requestsPerMinute: 50,
            inputTokensPerMinute: 20000,
            outputTokensPerMinute: 4000
        };

        setCurrentLimits(rateLimits[modelSettings.model] || modelDefaults);
    }, [modelSettings.model, rateLimits]);

    // Load saved model settings when component mounts
    useEffect(() => {
        if (!showSettings) return;

        const loadModelSettings = async () => {
            try {
                const savedSettings = await getModelSettings(modelSettings.model);
                // Always load the saved settings for the current model
                setModelSettings(prev => ({
                    ...prev,
                    temperature: savedSettings.temperature,
                    maxTokens: savedSettings.maxTokens
                }));
            } catch (error) {
                console.error('Error loading model settings:', error);
            }
        };

        loadModelSettings();
    }, [showSettings]); // Only depend on showSettings, not modelSettings.model to avoid infinite loops

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Save the current limits for the selected model
            setRateLimits(prev => ({
                ...prev,
                [modelSettings.model]: currentLimits
            }));

            // Save model-specific settings (temperature and maxTokens)
            await putModelSettings(modelSettings);

            setShowSettings(false);
        } catch (error) {
            console.error('Error saving settings:', error);
            // Could add user-visible error handling here
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset to saved values
        const modelDefaults = DEFAULT_RATE_LIMITS[modelSettings.model] || {};
        setCurrentLimits(rateLimits[modelSettings.model] || modelDefaults);
        setShowSettings(false);
    };

    const handleModelChange = async (newModel) => {
        try {
            // Load settings for the new model
            const newModelSettings = await getModelSettings(newModel);
            setModelSettings({
                model: newModel,
                temperature: newModelSettings.temperature,
                maxTokens: newModelSettings.maxTokens
            });
        } catch (error) {
            console.error('Error loading settings for new model:', error);
            // Fallback to basic model change with defaults
            setModelSettings(prev => ({
                ...prev,
                model: newModel,
                temperature: 1.0,
                maxTokens: 4000
            }));
        }
    };

    if (!showSettings) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Model Settings</h2>

                    {/* Model Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Model</label>
                        <select
                            value={modelSettings.model}
                            onChange={(e) => handleModelChange(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
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
                            disabled={isLoading}
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Conservative</span>
                            <span>Creative</span>
                        </div>
                    </div>

                    {/* Max Tokens */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Max Tokens
                            <span className="text-xs text-slate-500 ml-1">(saved per model)</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="8192"
                            value={modelSettings.maxTokens}
                            onChange={(e) => setModelSettings(prev => ({...prev, maxTokens: parseInt(e.target.value)}))}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Different models may have different optimal token limits
                        </p>
                    </div>

                    {/* Rate Limits Section */}
                    <div className="mb-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between w-full text-left"
                            disabled={isLoading}
                        >
                            <span className="text-sm font-medium text-slate-700">Rate Limits</span>
                            <svg
                                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
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
                                        disabled={isLoading}
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
                                        disabled={isLoading}
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
                                        disabled={isLoading}
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        const defaults = DEFAULT_RATE_LIMITS[modelSettings.model];
                                        if (defaults) setCurrentLimits(defaults);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700 disabled:text-slate-400"
                                    disabled={isLoading}
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
                                disabled={isLoading}
                            />
                            <div className="relative">
                                <div className={`w-10 h-6 rounded-full transition-colors ${
                                    showDebugInfo ? 'bg-blue-600' : 'bg-slate-300'
                                } ${isLoading ? 'opacity-50' : ''}`}>
                                    <div
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
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
                            className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelSettings;
