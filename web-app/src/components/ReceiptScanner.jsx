import { useState } from 'react';
import { Camera, UploadCloud, X } from 'lucide-react';
import './ReceiptScanner.css';

export default function ReceiptScanner({ onClose, onScanSuccess }) {
    const [file, setFile] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleScan = async () => {
        if (!file) {
            setError('Please select an image first.');
            return;
        }
        setError('');
        setIsScanning(true);

        try {
            const formData = new FormData();
            formData.append('receipt', file);
            formData.append('user_id', 'test_user_id');

            const response = await fetch('http://localhost:8000/api/v1/ai/scan-receipt', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to scan receipt');

            const resData = await response.json();
            onScanSuccess(resData.data);
        } catch (err) {
            setError(err.message || 'Error parsing receipt');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel">
                <button className="close-btn" onClick={onClose}><X /></button>

                <h2><Camera className="icon-glow" style={{ marginRight: 8 }} /> Scan Receipt</h2>
                <p className="subtitle">Our AI sẽ automatically extract the merchant, amount, and date.</p>

                <div className="upload-area">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        id="file-upload"
                        className="hidden-input"
                    />
                    <label htmlFor="file-upload" className="upload-label">
                        <UploadCloud size={48} className="icon-blue" />
                        <span>{file ? file.name : 'Click to upload a receipt image'}</span>
                    </label>
                </div>

                {error && <p className="error-text">{error}</p>}

                <button
                    className="btn-primary"
                    onClick={handleScan}
                    disabled={isScanning || !file}
                    style={{ width: '100%', marginTop: '1.5rem' }}
                >
                    {isScanning ? 'Extracting Data with AI...' : 'Analyze Receipt'}
                </button>
            </div>
        </div>
    );
}
