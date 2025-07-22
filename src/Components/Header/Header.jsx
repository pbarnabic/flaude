import React from "react";
import {Download, Eye, EyeOff, Key, Menu, Sparkles, Trash2, Upload, Code, Settings} from "lucide-react";
import {MODELS} from "../../Constants/Models.js";


const Header = ({
                    showApiKey,
                    setShowApiKey,
                    apiKey,
                    setApiKey,
                    handleClear,
                    showMobileMenu,
                    setShowMobileMenu,
                    artifacts,
                    showArtifacts,
                    setShowArtifacts,
                    setShowSettings,
                    modelSettings
                }) => {

    return (
        <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                        <Sparkles className="w-5 h-5 text-white"/>
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Claude Clone
                    </h1>
                    {/* Model indicator */}
                    <div className="hidden sm:block text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                        {MODELS[modelSettings?.model] || 'Unknown Model'}
                    </div>
                </div>

                {/* Desktop Controls */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                        <Key className="w-4 h-4 text-slate-500"/>
                        <input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter API Key"
                            className="bg-transparent text-sm w-48 focus:outline-none placeholder:text-slate-400"
                        />
                        <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            {showApiKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>
                    <div className="flex gap-1">
                        {/* Settings button */}
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-all hover:shadow-md"
                            title="Model settings"
                        >
                            <Settings className="w-5 h-5 text-slate-600"/>
                        </button>
                        {/* Artifacts toggle button - only show if artifacts exist */}
                        {Object.keys(artifacts || {}).length > 0 && (
                            <button
                                onClick={() => setShowArtifacts(!showArtifacts)}
                                className={`p-2 rounded-lg transition-all hover:shadow-md ${
                                    showArtifacts
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'hover:bg-slate-100 text-slate-600'
                                }`}
                                title={showArtifacts ? "Hide artifacts" : "Show artifacts"}
                            >
                                <Code className="w-5 h-5"/>
                            </button>
                        )}
                        <button
                            onClick={handleClear}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-all hover:shadow-md"
                            title="Clear conversation"
                        >
                            <Trash2 className="w-5 h-5 text-slate-600"/>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5 text-slate-600"/>
                </button>
            </div>

            {/* Mobile Menu */}
            {showMobileMenu && (
                <div className="md:hidden mt-4 space-y-3 pb-2">
                    {/* Mobile Model indicator */}
                    <div className="text-center text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                        Current: {modelSettings?.model === 'claude-sonnet-4-20250514' ? 'Sonnet 3.5 (Latest)' :
                        modelSettings?.model === 'claude-3-5-sonnet-20241022' ? 'Sonnet 3.5 (Oct)' :
                            modelSettings?.model === 'claude-3-5-haiku-20241022' ? 'Haiku 3.5' :
                                modelSettings?.model === 'claude-3-opus-20240229' ? 'Opus 3' : 'Sonnet 3.5'}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                        <Key className="w-4 h-4 text-slate-500"/>
                        <input
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter API Key"
                            className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-slate-400"
                        />
                        <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            {showApiKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {/* Mobile Settings button */}
                        <button
                            onClick={() => {
                                setShowSettings(true);
                                setShowMobileMenu(false);
                            }}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings className="w-4 h-4"/>
                            <span className="text-sm">Settings</span>
                        </button>

                        {/* Mobile Artifacts button */}
                        {Object.keys(artifacts || {}).length > 0 && (
                            <button
                                onClick={() => {
                                    setShowArtifacts(!showArtifacts);
                                    setShowMobileMenu(false);
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                    showArtifacts
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'bg-slate-100 hover:bg-slate-200'
                                }`}
                            >
                                <Code className="w-4 h-4"/>
                                <span className="text-sm">Artifacts</span>
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleClear}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4"/>
                            <span className="text-sm">Clear</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Header;
