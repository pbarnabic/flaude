import React from 'react';
import {Code, Palette, Sparkles, Terminal} from "lucide-react";

const EmptyMessages = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-4">
        <div className="text-center max-w-md">
            {/* Animated icon */}
            <div className="relative mb-6">
                <div
                    className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                    <Sparkles className="w-10 h-10 text-white"/>
                </div>
                <div
                    className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
            </div>

            {/* Main heading */}
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                Ready to Create
            </h2>

            {/* Subtitle */}
            <p className="text-slate-600 mb-8 text-base sm:text-lg">
                Let's build something amazing together. I can help you code, design, analyze, and create.
            </p>

            {/* Suggestion cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                <div
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <Code className="w-6 h-6 text-blue-600 mb-2 mx-auto"/>
                    <div className="text-sm font-medium text-slate-800 mb-1">Write Code</div>
                    <div className="text-xs text-slate-600">Apps, scripts, algorithms</div>
                </div>

                <div
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <Palette className="w-6 h-6 text-purple-600 mb-2 mx-auto"/>
                    <div className="text-sm font-medium text-slate-800 mb-1">Design UI</div>
                    <div className="text-xs text-slate-600">Websites, components</div>
                </div>

                <div
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <Terminal className="w-6 h-6 text-green-600 mb-2 mx-auto"/>
                    <div className="text-sm font-medium text-slate-800 mb-1">Analyze Data</div>
                    <div className="text-xs text-slate-600">Charts, insights, reports</div>
                </div>
            </div>

            {/* Example prompts */}
            <div className="text-left">
                <div className="text-sm font-medium text-slate-700 mb-3">Try asking me to:</div>
                <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        <span>"Build a todo app with React"</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                        <span>"Create a landing page for my startup"</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <span>"Write a Python script to analyze CSV data"</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                        <span>"Design an interactive data visualization"</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default EmptyMessages;
