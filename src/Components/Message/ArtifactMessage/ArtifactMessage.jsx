import React from "react";
import {Bot, Code, FileText, Package} from "lucide-react";

const ArtifactMessage = ({message, onArtifactClick}) => {
    if (!message.artifact) return null;

    const artifact = message.artifact;
    const icon = (artifact.type === "application/vnd.ant.code" || artifact.language) ? (
        <Code className="w-4 h-4"/>
    ) : (
        <FileText className="w-4 h-4"/>
    );

    const displayType = artifact.language ||
        (artifact.type ? artifact.type.split("/").pop() : "Unknown");

    return (
        <div className="flex gap-2 sm:gap-3 justify-start w-full">
            <div className="flex-shrink-0 w-8 h-8">
                <div
                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 text-white"/>
                </div>
            </div>
            <div className="min-w-0 flex-1" style={{maxWidth: 'calc(100% - 2.5rem)'}}>
                <button
                    onClick={() => onArtifactClick?.(message.artifactId)}
                    className="w-full rounded-2xl px-3 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300 cursor-pointer group"
                >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div
                            className="flex-shrink-0 p-1.5 sm:p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
                            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600"/>
                        </div>
                        <div className="text-left min-w-0 flex-1 overflow-hidden">
                            <div className="font-medium text-slate-800 truncate text-sm sm:text-base">
                                {artifact.title || "Untitled Artifact"}
                            </div>
                            <div className="text-xs sm:text-sm text-slate-600 flex items-center gap-1 sm:gap-2 mt-0.5">
                                {icon}
                                <span className="truncate">{displayType}</span>
                                {!artifact.isComplete && (
                                    <span className="text-amber-600 whitespace-nowrap">(In progress...)</span>
                                )}
                            </div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default ArtifactMessage;
