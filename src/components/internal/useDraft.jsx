import { useState, useEffect, useRef } from 'react';

/**
 * Hook que salva automaticamente o estado do formulário no localStorage.
 * @param {string} draftKey - chave única para este rascunho (ex: 'draft_dailylog')
 * @param {object} initialValue - valor inicial se não houver rascunho salvo
 * @param {boolean} isEditing - se true (editando registro existente), não usa rascunho
 */
export function useDraft(draftKey, initialValue, isEditing = false) {
  const getSaved = () => {
    if (isEditing) return null;
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const saved = getSaved();
  const [form, setFormState] = useState(saved || initialValue);
  const [hasDraft, setHasDraft] = useState(!isEditing && !!saved);
  const saveTimerRef = useRef(null);

  // Auto-save com debounce de 800ms
  const setForm = (value) => {
    setFormState(value);
    if (isEditing) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(value));
        setHasDraft(true);
      } catch {}
    }, 800);
  };

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  };

  const restoreDraft = () => {
    const saved = getSaved();
    if (saved) {
      setFormState(saved);
      setHasDraft(true);
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { form, setForm, hasDraft, clearDraft, restoreDraft };
}