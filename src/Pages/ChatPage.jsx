import React, {useState} from 'react';
import {useAuthentication} from "../Contexts/AuthenticationContext.jsx";
import ChatSidebar from "../Components/ChatSidebar/ChatSidebar.jsx";
import Chat from "../Components/Chat/Chat.jsx";

const ChatPage = () => {
    const {isAuthenticated} = useAuthentication();
    const [showChatSidebar, setShowChatSidebar] = useState(window.innerWidth >= 1024);
    const [modelSettings] = useState({
        model: 'claude-sonnet-4-20250514',
        temperature: 1.0,
        maxTokens: 8000
    });

    // Handle window resize to auto-hide sidebar on mobile but keep desktop behavior
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                // On mobile/tablet, close the sidebar overlay
                setShowChatSidebar(false);
            }
            // On desktop, keep whatever state the user set
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Don't render chat interface until authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Chat Sidebar - collapsible on desktop, overlay on mobile */}
            <div className={`
                ${showChatSidebar ? 'w-80' : 'w-0'} 
                transition-all duration-300 ease-in-out
                hidden lg:block
            `}>
                <ChatSidebar
                    isOpen={showChatSidebar}
                    onClose={() => setShowChatSidebar(false)}
                    modelSettings={modelSettings}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {showChatSidebar && window.innerWidth < 1024 && (
                <div className="lg:hidden">
                    <ChatSidebar
                        isOpen={showChatSidebar}
                        onClose={() => setShowChatSidebar(false)}
                        modelSettings={modelSettings}
                    />
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 min-w-0">
                <Chat
                    showChatSidebar={showChatSidebar}
                    setShowChatSidebar={setShowChatSidebar}
                    modelSettings={modelSettings}
                />
            </div>
        </div>
    );
};

export default ChatPage;
