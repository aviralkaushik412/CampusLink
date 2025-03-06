// src/components/Chat.jsx
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './styles/Chat.css';

let socket;

function Chat({ username, onLogout }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState(1);
    const messagesEndRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Initialize socket connection
        socket = io('http://localhost:5001', {
            auth: { token: localStorage.getItem('token') }
        });

        // Socket event handlers
        socket.on('connect', () => {
            console.log('Connected to server');
            setIsConnected(true);
        });

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            if (err.message === 'Authentication error') {
                onLogout();
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        socket.on('load messages', (initialMessages) => {
            console.log('Received initial messages:', initialMessages);
            setMessages(initialMessages);
        });

        socket.on('chat message', (message) => {
            console.log('Received new message:', message);
            setMessages(prev => [...prev, message]);
        });

        socket.on('active users', (count) => {
            setActiveUsers(count);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // Cleanup on unmount
        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('load messages');
                socket.off('chat message');
                socket.off('active users');
                socket.off('error');
                socket.disconnect();
            }
        };
    }, [onLogout]);

    // Scroll to bottom when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing', true);
        }
    };

    const handleStopTyping = () => {
        setIsTyping(false);
        socket.emit('typing', false);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Only allow images
        if (!file.type.startsWith('image/')) {
            alert('Please upload only image files.');
            return;
        }

        // Max size 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert('Please upload images smaller than 5MB.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);

            // Upload image to server
            const response = await fetch('http://localhost:5001/api/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            
            // Send message with image URL
            socket.emit('chat message', {
                type: 'image',
                url: data.url,
                text: 'Sent an image'
            });
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && isConnected) {
            socket.emit('chat message', {
                type: 'text',
                text: input
            });
            setInput('');
            handleStopTyping();
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat">
            <div className="header">
                <div className="header-left">
                    <a href="#" className="header-logo">
                        🎓 CampusLink
                    </a>
                    <div className="active-users">
                        <span>Active:</span>
                        <span className="active-users-count">{activeUsers}</span>
                    </div>
                </div>
                <div className="user-info">
                    <span className="user-status" style={{ color: isConnected ? '#00ff9d' : '#ff4444' }}>●</span>
                    <span className="username">{username}</span>
                    <button onClick={onLogout}>Logout</button>
                </div>
            </div>
            <div className="messages">
                {messages.map((msg) => (
                    <div 
                        key={msg._id} 
                        className={`message ${msg.username === username ? 'sent' : 'received'}`}
                    >
                        <div className="message-content">
                            <span className="username">{msg.username}</span>
                            {msg.type === 'image' ? (
                                <div className="image-container">
                                    <img src={msg.url} alt="Shared image" />
                                </div>
                            ) : (
                                <span className="text">{msg.text}</span>
                            )}
                            <span className="timestamp">{formatTime(msg.timestamp)}</span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="message-form">
                <button 
                    type="button" 
                    className="attachment-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isConnected}
                >
                    📎
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
                <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        handleTyping();
                    }}
                    onBlur={handleStopTyping}
                    placeholder="Type a message..."
                    disabled={!isConnected}
                />
                <button type="submit" disabled={!isConnected || !input.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
}

export default Chat;