import React, { useState } from 'react';

/**
 * Obtém as iniciais do usuário para o fallback visual neutro.
 */
export function getUserInitials(name, email) {
  if (name && typeof name === 'string') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }
  if (email && typeof email === 'string') {
    const cleanEmail = email.trim();
    return cleanEmail.length > 0 ? cleanEmail[0].toUpperCase() : 'U';
  }
  return 'U';
}

/**
 * Verifica se a URL não é um logo institucional da Tera Robotics ou Base44 salvo por engano.
 */
function isUserPhotoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('logotera') ||
    lower.includes('whatsappimage') ||
    lower.includes('base44.com/logo') ||
    lower.includes('logo-minimalist') ||
    lower.includes('logo-complete') ||
    lower.includes('tera-logo') ||
    lower.includes('favicon') ||
    lower.includes('base44-prod/public/698a86446abc83aece20025a/71928ec1c') ||
    lower.includes('base44-prod/public/698a86446abc83aece20025a/553877171')
  ) {
    return false;
  }
  return true;
}

/**
 * Resolve a URL do avatar de acordo com a prioridade:
 * 1. Foto do Google disponível na sessão atual (user_metadata.avatar_url ou user_metadata.picture)
 * 2. avatar_url salvo no profile (se não for logo institucional)
 * 3. Fallback neutro (null)
 */
export function resolveUserAvatarUrl(user) {
  if (!user) return null;

  // 1. Foto do Google na sessão atual
  const googlePhoto =
    user.google_avatar_url ||
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  if (googlePhoto && isUserPhotoUrl(googlePhoto)) {
    return googlePhoto;
  }

  // 2. avatar_url salvo no profile
  const profileAvatar = user.avatar_url;
  if (profileAvatar && isUserPhotoUrl(profileAvatar)) {
    return profileAvatar;
  }

  return null;
}

/**
 * Componente UserAvatar
 * Exibe a foto do Google ou avatar do profile, caindo de forma graciosa para as iniciais.
 */
export default function UserAvatar({ user, className = "w-8 h-8", alt }) {
  const [imageError, setImageError] = useState(false);

  const avatarUrl = resolveUserAvatarUrl(user);
  const initials = getUserInitials(user?.full_name, user?.email);
  const displayName = user?.full_name || user?.email || 'Usuário';

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={alt || displayName}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={`${className} rounded-full object-cover border border-white/10 flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-[#1F222B] border border-white/15 text-gray-200 font-semibold flex items-center justify-center select-none uppercase flex-shrink-0 tracking-wider`}
      title={displayName}
      aria-label={displayName}
    >
      {initials}
    </div>
  );
}
