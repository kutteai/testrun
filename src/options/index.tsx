import React from 'react';
import { createRoot } from 'react-dom/client';

const OptionsPage: React.FC = () => {
  return (
    <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">PayCio Wallet Options</h1>
      <p>Options page coming soon...</p>
    </div>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<OptionsPage />);
  }
}); 