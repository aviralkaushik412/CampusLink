import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Chat from '../components/Chat.jsx';
import Login from '../components/Login.jsx';
import Register from '../components/Register.jsx';
import './App.css';

function App() {
    const [username, setUsername] = useState(localStorage.getItem('username') || '');
    const navigate = useNavigate(); 

    const handleLogin = (username) => {
        console.log('Handle login called with:', username);
        setUsername(username);
        localStorage.setItem('username', username);
        navigate('/chat'); 
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setUsername('');
        navigate('/login'); 
    };

    return (
        <div className="app">
            <Routes>
                <Route
                    path="/chat"
                    element={
                        username ? (
                            <Chat username={username} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
                <Route
                    path="/login"
                    element={
                        <Login 
                            onLogin={handleLogin} 
                            onSwitchToRegister={() => navigate('/register')} 
                        />
                    }
                />
                <Route
                    path="/register"
                    element={
                        <Register 
                            onRegister={handleLogin} 
                            onSwitchToLogin={() => navigate('/login')} 
                        />
                    }
                />
                <Route
                    path="*"
                    element={<Navigate to="/login" />}
                />
            </Routes>
        </div>
    );
}

function AppWrapper() {
    return (
        <Router>
            <App />
        </Router>
    );
}

export default AppWrapper;