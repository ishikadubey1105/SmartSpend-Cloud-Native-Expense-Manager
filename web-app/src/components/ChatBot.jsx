import { useState } from 'react';
import { Send, Sparkles, MessageSquare } from 'lucide-react';
import './ChatBot.css';

export default function ChatBot({ userId }) {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hi! I am SmartSpend AI. How can I help with your finances today? Try asking "How much did I spend on food this month?"' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Intended to point to our Python Backend FastAPI endpoint
            const response = await fetch('http://localhost:8000/api/v1/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: userMessage.text,
                    user_id: userId || 'test_user_id'
                })
            });

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I am having trouble connecting to my brain right now.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container glass-panel">
            <div className="chat-header">
                <Sparkles className="icon-glow" size={24} />
                <h3>SmartSpend Financial Advisor</h3>
            </div>

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message-bubble ${msg.role}`}>
                        {msg.text}
                    </div>
                ))}
                {isLoading && (
                    <div className="message-bubble ai loading">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                )}
            </div>

            <form onSubmit={sendMessage} className="chat-input-area">
                <input
                    type="text"
                    placeholder="Ask a question about your spending..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" disabled={isLoading} className="send-btn">
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
