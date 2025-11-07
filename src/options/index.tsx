import React from 'react';
import { createRoot } from 'react-dom/client';

const OptionsPage: React.FC = () => {
  return (
    <div className="p-6 flex items-center justify-center h-screen w-screen">
      <h1 className="text-2xl font-bold">Options Static Design</h1>
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