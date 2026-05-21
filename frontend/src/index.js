import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // มั่นใจว่ามีไฟล์นี้อยู่ในโฟลเดอร์ src นะครับ

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);