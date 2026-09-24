import React from 'react';
import toast from 'react-hot-toast';
import { Toast } from './ui';

function show(tone, title, message) {
  return toast.custom(
    (t) => (
      <div style={{ opacity: t.visible ? 1 : 0, transition: 'opacity .15s ease' }}>
        <Toast tone={tone} title={title}>{message}</Toast>
      </div>
    ),
    { duration: 4000 }
  );
}

export const notify = {
  success: (title, message) => show('success', title, message),
  error: (title, message) => show('error', title, message),
  info: (title, message) => show('info', title, message),
};
