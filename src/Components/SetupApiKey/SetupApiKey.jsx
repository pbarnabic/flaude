import React from 'react';
import {Key} from "lucide-react";

const SetupApiKey = ({apiKey, setApiKey}) => {
    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="max-w-md w-full">
                    <div className="text-center">
                        {/* Animated icon */}
                        <div className="relative mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                                <Key className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center animate-pulse">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>

                        {/* Main heading */}
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                            Welcome to Flaude
                        </h1>

                        {/* Subtitle */}
                        <p className="text-slate-600 mb-8 text-base sm:text-lg">
                            To get started, you'll need to set up your Anthropic API key.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <label htmlFor="initialApiKey" className="block text-sm font-medium text-slate-700 mb-2">
                                Anthropic API Key
                            </label>
                            <input
                                type="password"
                                id="initialApiKey"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="sk-ant-..."
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Your API key will be encrypted and stored securely in your browser.
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                            <div className="text-sm text-slate-700">
                                <div className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                    How to get your API key:
                                </div>
                                <div className="space-y-2 text-slate-600">
                                    <div className="flex items-start gap-2">
                                        <span className="text-blue-500 font-medium">1.</span>
                                        <span>Go to <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-medium">console.anthropic.com</a></span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-purple-500 font-medium">2.</span>
                                        <span>Sign in to your account</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-pink-500 font-medium">3.</span>
                                        <span>Navigate to "API Keys" in the sidebar</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-green-500 font-medium">4.</span>
                                        <span>Click "Create Key" and copy the generated key</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SetupApiKey;
