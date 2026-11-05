import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';

// Keep drafts scoped to the current account, including on a shared computer.
export function useDraft(draftKey, initialValue, isEditing = false) {
  const { user } = useAuth();
  const key = user?.id ? `${draftKey}:${user.id}` : null;
  const read = () => {
    if (isEditing || !key) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...initialValue, ...saved } : null;
    } catch { return null; }
  };
  const [state, setState] = useState(() => ({ key, value: read() || initialValue }));
  const [hasDraft, setHasDraft] = useState(() => Boolean(read()));
  const activeKey = useRef(key);
  activeKey.current = key;
  const valueRef = useRef(state.value);
  const timer = useRef(null);
  const pending = useRef(null);
  const flush = () => {
    const snapshot = pending.current;
    pending.current = null;
    if (!snapshot) return;
    try { localStorage.setItem(snapshot.key, JSON.stringify(snapshot.value)); } catch { /* Storage may be full or disabled. */ }
  };
  const setForm = value => {
    // Ignore a late upload result belonging to an account that has signed out.
    if (activeKey.current !== key) return;
    const next = typeof value === 'function' ? value(valueRef.current) : value;
    valueRef.current = next;
    setState({ key, value: next });
    clearTimeout(timer.current);
    if (isEditing || !key) return;
    pending.current = { key, value: next };
    timer.current = setTimeout(() => { flush(); setHasDraft(true); }, 800);
  };
  const clearDraft = () => {
    clearTimeout(timer.current);
    pending.current = null;
    try { if (key) localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
    setHasDraft(false);
  };
  const restoreDraft = () => {
    const saved = read();
    if (saved) { valueRef.current = saved; setState({ key, value: saved }); setHasDraft(true); }
  };
  useEffect(() => {
    const saved = read();
    valueRef.current = saved || initialValue;
    setState({ key, value: valueRef.current });
    setHasDraft(Boolean(saved));
    return () => { clearTimeout(timer.current); flush(); };
  }, [key, isEditing]);
  return { form: state.key === key ? state.value : initialValue, setForm, hasDraft: state.key === key && hasDraft, clearDraft, restoreDraft };
}
