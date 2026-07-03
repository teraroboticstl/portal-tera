import { base44 } from '@/api/base44Client';

/**
 * Registra uma ação no Audit Log.
 * @param {object} user - Objeto do usuário (com id, full_name, email)
 * @param {'CREATE'|'UPDATE'|'DELETE'|'UPLOAD'|'LOGIN'|'CONFIG'} actionType
 * @param {string} description - Descrição legível da ação (ex: "Criou Log Diário: Reunião de kick-off")
 * @param {string} [entityName] - Nome da entidade afetada (opcional)
 */
export async function logAudit(user, actionType, description, entityName = '') {
  if (!user) return;
  try {
    await base44.entities.AuditLog.create({
      user_id: user.id || '',
      user_name: user.full_name || user.email || 'Desconhecido',
      user_email: user.email || '',
      action_type: actionType,
      description,
      entity_name: entityName,
      user_agent: navigator?.userAgent?.substring(0, 200) || '',
    });
  } catch (e) {
    // Silencioso — log não deve travar a aplicação
    console.warn('[AuditLog] Falha ao registrar ação:', e?.message);
  }
}