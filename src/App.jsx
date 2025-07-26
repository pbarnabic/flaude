import React from 'react';
import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import ChatPage from "./Pages/ChatPage.jsx";
import ArtifactPreviewPage from "./Pages/ArtifactPreviewPage.jsx";
import AuthenticationModal from './Components/AuthenticationModal/AuthenticationModal.jsx';
import {ChatsProvider} from './Contexts/ChatsContext.jsx';
import {AuthenticationProvider, useAuthentication} from './Contexts/AuthenticationContext.jsx';

const AuthenticatedApp = () => {
    const {isAuthenticated} = useAuthentication();
    return (
        <>
            <AuthenticationModal/>
            {isAuthenticated && (
                <ChatsProvider>
                    <Routes>
                        {/* Redirect root to new chat */}
                        <Route path="/" element={<Navigate to="/chat" replace/>}/>

                        {/* Handle /chat (will create new chat) */}
                        <Route path="/chat" element={<ChatPage/>}/>

                        {/* Handle specific chat routes */}
                        <Route path="/chats/:chatId" element={<ChatPage/>}/>

                        {/* Handle artifact preview routes */}
                        <Route path="/preview/:chatId" element={<ArtifactPreviewPage/>}/>

                        {/* Fallback route */}
                        <Route path="*" element={<Navigate to="/chat" replace/>}/>
                    </Routes>
                </ChatsProvider>
            )}
        </>
    );
};

const App = () => {
    return (
        <Router>
            <AuthenticationProvider>
                <AuthenticatedApp/>
            </AuthenticationProvider>
        </Router>
    );
};

export default App;
