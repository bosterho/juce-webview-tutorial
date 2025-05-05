import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Wait for the DOM to be fully loaded and JUCE scripts to initialize
document.addEventListener('DOMContentLoaded', () => {
  // Create React root and render the App component
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});