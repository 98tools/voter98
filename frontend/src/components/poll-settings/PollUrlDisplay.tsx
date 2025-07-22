import React, { useState } from 'react';

interface PollUrlDisplayProps {
  pollId: string;
}

const PollUrlDisplay: React.FC<PollUrlDisplayProps> = ({ pollId }) => {
  const [copied, setCopied] = useState(false);
  
  // Generate the poll participation URL
  const pollUrl = `${window.location.origin}/poll/${pollId}`;
  
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = pollUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2">
      <span className="text-sm text-gray-700 font-medium">Poll URL:</span>
      <div className="flex items-center space-x-2">
        <code className="text-sm text-gray-800 bg-white px-2 py-1 rounded border border-gray-200 font-mono">
          {pollUrl}
        </code>
        <button
          onClick={handleCopyUrl}
          className="inline-flex items-center p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors duration-200"
          title="Copy URL"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11.586l-3-3a1 1 0 00-1.414 0L9 10.172V13h2.586l-1.293 1.293a1 1 0 101.414 1.414l3-3z" />
            </svg>
          )}
        </button>
      </div>
      {copied && (
        <span className="text-xs text-green-600 font-medium">Copied!</span>
      )}
    </div>
  );
};

export default PollUrlDisplay;
