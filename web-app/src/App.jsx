import { useState } from 'react'
import { Wallet, Sparkles, Receipt, PieChart, MessageSquare } from 'lucide-react'
import ChatBot from './components/ChatBot'
import ReceiptScanner from './components/ReceiptScanner'
import './index.css'

function App() {
    const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' or 'chat'
    const [showScanner, setShowScanner] = useState(false)

    // Dummy data for now
    const [balance, setBalance] = useState(45200)

    const handleScanSuccess = (extractedData) => {
        alert(`Successfully extracted: ₹${extractedData.amount} at ${extractedData.merchant}`);
        setBalance(prev => prev + extractedData.amount); // Simplistic demo logic
        setShowScanner(false);
    }

    return (
        <div className="layout">
            {/* Background Orbs */}
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>

            {/* Main Glassmorphism Container */}
            <main className="glass-panel main-dashboard">
                <header className="header">
                    <div className="logo">
                        <Sparkles className="icon-glow" />
                        <h1>SmartSpend</h1>
                    </div>
                    <nav>
                        <button
                            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            Dashboard
                        </button>
                        <button
                            className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageSquare size={16} /> Chat AI
                        </button>
                    </nav>
                </header>

                {activeTab === 'dashboard' ? (
                    <section className="dashboard-content fade-in">
                        <div className="balance-card glass-panel">
                            <div className="card-header">
                                <Wallet className="icon-blue" />
                                <span>Total spent this month</span>
                            </div>
                            <h2 className="amount">₹{balance.toLocaleString('en-IN')}</h2>
                            <p className="trend positive">+12% from last month</p>
                        </div>

                        <div className="quick-actions">
                            <button className="btn-primary" onClick={() => setShowScanner(true)}>
                                <Receipt /> Scan Receipt
                            </button>
                            <button className="btn-secondary">
                                <PieChart /> Budget Analysis
                            </button>
                        </div>

                        {/* Display Anomalies/Recent here if needed */}
                    </section>
                ) : (
                    <section className="fade-in">
                        <ChatBot userId="test_user" />
                    </section>
                )}

                {showScanner && (
                    <ReceiptScanner
                        onClose={() => setShowScanner(false)}
                        onScanSuccess={handleScanSuccess}
                    />
                )}
            </main>
        </div>
    )
}

export default App
