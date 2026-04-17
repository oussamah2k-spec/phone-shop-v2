import React, { useEffect } from 'react';

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

function Toast({ id, message, type, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 3000);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <span style={{ fontSize: '1.2em', fontWeight: 'bold', marginRight: '8px' }}>
        {getIcon()}
      </span>
      <p className="toast-message">{message}</p>
      <button
        className="toast-close"
        onClick={onRemove}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
