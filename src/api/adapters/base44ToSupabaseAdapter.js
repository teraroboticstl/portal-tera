import { supabase } from '../supabaseClient';

/**
 * Tradutor e adaptador de chamadas CRUD NoSQL para SQL (Supabase).
 * Preserva o padrão de retornos e assinaturas de métodos do SDK original para evitar
 * quebras de contrato com o TanStack React Query e componentes visuais.
 * 
 * Agora conecta-se EXCLUSIVAMENTE ao Supabase, descartando dependências antigas.
 */
export const createEntityAdapter = (entityName, tableName = '') => {
  // Converter camelCase/PascalCase de entidades para snake_case das tabelas PostgreSQL
  const defaultTable = entityName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, ''); // Remove leading underscore se houver

  const actualTableName = tableName || defaultTable;

  // Helper para injetar o campo virtual created_date esperado por muitas páginas do Portal Tera
  const mapItem = (item) => {
    if (!item) return item;
    return {
      ...item,
      created_date: item.created_at || item.created_date || null
    };
  };

  const mapItems = (items) => {
    if (!items || !Array.isArray(items)) return items;
    return items.map(mapItem);
  };

  return {
    /**
     * Lista todos os registros da entidade com suporte para ordenação personalizada.
     */
    async list(query = {}) {
      console.log(`[Supabase Adapter] Buscando registros de ${entityName} (Tabela: ${actualTableName})...`);
      
      let req = supabase.from(actualTableName).select('*');

      let orderField = 'created_at';
      let ascending = false;

      // Suporta assinatura list('-created_date'), list('order'), etc.
      if (typeof query === 'string') {
        const cleanQuery = query.trim();
        ascending = !cleanQuery.startsWith('-');
        const rawField = cleanQuery.startsWith('-') ? cleanQuery.substring(1) : cleanQuery;
        orderField = rawField === 'created_date' ? 'created_at' : rawField;
      } else if (['daily_logs', 'board_diaries', 'meeting_notes', 'prototype_tests'].includes(actualTableName)) {
        orderField = 'date';
        ascending = false;
      }

      req = req.order(orderField, { ascending });

      const { data, error } = await req;

      if (error) {
        console.error(`[Supabase Adapter] Erro ao buscar no Supabase (${entityName}):`, error);
        throw error;
      }
      return mapItems(data) || [];
    },

    /**
     * Filtra registros (equivalente ao filter do NoSQL antigo).
     */
    async filter(filterObj = {}, order = '', limit = null) {
      console.log(`[Supabase Adapter] Filtrando ${entityName} (Tabela: ${actualTableName})...`, filterObj);
      
      let req = supabase.from(actualTableName).select('*');
      
      // Aplicar filtros simples de igualdade
      Object.entries(filterObj).forEach(([key, val]) => {
        req = req.eq(key, val);
      });

      if (order) {
        const isDescending = order.startsWith('-');
        const rawField = isDescending ? order.substring(1) : order;
        const orderField = rawField === 'created_date' ? 'created_at' : rawField;
        req = req.order(orderField, { ascending: !isDescending });
      } else {
        req = req.order('created_at', { ascending: false });
      }

      if (limit) {
        req = req.limit(limit);
      }

      const { data, error } = await req;

      if (error) {
        console.error(`[Supabase Adapter] Erro ao filtrar no Supabase (${entityName}):`, error);
        throw error;
      }
      return mapItems(data) || [];
    },

    /**
     * Obtém um registro específico pelo ID.
     */
    async get(id) {
      console.log(`[Supabase Adapter] Buscando ID ${id} de ${entityName} no Supabase...`);
      const { data, error } = await supabase
        .from(actualTableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`[Supabase Adapter] Erro ao obter no Supabase (${entityName}):`, error);
        throw error;
      }
      return mapItem(data);
    },

    /**
     * Cria um novo registro.
     */
    async create(payload) {
      console.log(`[Supabase Adapter] Criando registro em ${entityName} no Supabase...`, payload);
      
      const sanitized = { ...payload };
      delete sanitized.id;
      delete sanitized.created_date;

      // Tratar strings vazias em UUIDs/Foreign Keys para null
      for (const key of Object.keys(sanitized)) {
        if ((key.endsWith('_id') || key === 'user_id') && sanitized[key] === '') {
          sanitized[key] = null;
        }
      }

      const { data, error } = await supabase
        .from(actualTableName)
        .insert([sanitized])
        .select()
        .single();

      if (error) {
        console.error(`[Supabase Adapter] Erro ao criar no Supabase (${entityName}):`, error);
        throw error;
      }
      return mapItem(data);
    },

    /**
     * Atualiza um registro existente.
     */
    async update(id, payload) {
      console.log(`[Supabase Adapter] Atualizando ID ${id} de ${entityName} no Supabase...`, payload);
      
      const sanitized = { ...payload };
      delete sanitized.id;
      delete sanitized.created_date;

      for (const key of Object.keys(sanitized)) {
        if ((key.endsWith('_id') || key === 'user_id') && sanitized[key] === '') {
          sanitized[key] = null;
        }
      }

      const { data, error } = await supabase
        .from(actualTableName)
        .update(sanitized)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[Supabase Adapter] Erro ao atualizar no Supabase (${entityName}):`, error);
        throw error;
      }
      return mapItem(data);
    },

    /**
     * Remove um registro.
     */
    async delete(id) {
      console.log(`[Supabase Adapter] Deletando ID ${id} de ${entityName} no Supabase...`);
      const { error } = await supabase
        .from(actualTableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[Supabase Adapter] Erro ao deletar no Supabase (${entityName}):`, error);
        throw error;
      }
      return { success: true, id };
    }
  };
};

/**
 * Mapeamento customizado de nomes de tabela para entidades que não seguem o padrão estrito.
 */
const rawEntities = {
  // Entidades básicas e comuns de Usuário
  User: createEntityAdapter('User', 'profiles'),
  UserPresence: createEntityAdapter('UserPresence', 'user_presences'),
  DailyLog: createEntityAdapter('DailyLog', 'daily_logs'),
  MeetingNote: createEntityAdapter('MeetingNote', 'meeting_notes'),
  FLLTask: createEntityAdapter('FLLTask', 'fll_tasks'),
  AuditLog: createEntityAdapter('AuditLog', 'audit_logs'),
  OnshapeConfig: createEntityAdapter('OnshapeConfig', 'onshape_configs'),
  InternalProject: createEntityAdapter('InternalProject', 'internal_projects'),
  Priority: createEntityAdapter('Priority', 'priorities'),
  ProjectRisk: createEntityAdapter('ProjectRisk', 'project_risks'),
  PrototypeTest: createEntityAdapter('PrototypeTest', 'prototype_tests'),
  FLLMember: createEntityAdapter('FLLMember', 'fll_members'),
  FLLMission: createEntityAdapter('FLLMission', 'fll_missions'),
  FLLAttachment: createEntityAdapter('FLLAttachment', 'fll_attachments'),
  FLLCoreValues: createEntityAdapter('FLLCoreValues', 'fll_core_values'),
  FLLInnovationProject: createEntityAdapter('FLLInnovationProject', 'fll_innovation_projects'),
  FLLJudgePrep: createEntityAdapter('FLLJudgePrep', 'fll_judge_preps'),
  TIREquipe: createEntityAdapter('TIREquipe', 'tir_equipes'),
  TIRFoto: createEntityAdapter('TIRFoto', 'tir_fotos'),
  TIRMensagem: createEntityAdapter('TIRMensagem', 'tir_mensagens'),
  TIRRegra: createEntityAdapter('TIRRegra', 'tir_regras'),
  ESGInitiative: createEntityAdapter('ESGInitiative', 'esg_initiatives'),
  BoardDiary: createEntityAdapter('BoardDiary', 'board_diaries'),

  // Novas entidades identificadas durante a auditoria de páginas
  Season: createEntityAdapter('Season', 'seasons'),
  Robot: createEntityAdapter('Robot', 'robots'),
  Sponsor: createEntityAdapter('Sponsor', 'sponsors'),
  Project: createEntityAdapter('Project', 'projects'),
  Product: createEntityAdapter('Product', 'products'),
  FRCScout: createEntityAdapter('FRCScout', 'frc_scouts'),
  Team: createEntityAdapter('Team', 'teams'),
  PDI: createEntityAdapter('PDI', 'pdis'),
  ScoutFTC: createEntityAdapter('ScoutFTC', 'scout_ftcs'),
  Match: createEntityAdapter('Match', 'matches'),
  PDIFRC: createEntityAdapter('PDIFRC', 'pdi_frcs'),
  TeamLog: createEntityAdapter('TeamLog', 'team_logs'),
  EventGallery: createEntityAdapter('EventGallery', 'event_galleries'),
  EventMedia: createEntityAdapter('EventMedia', 'event_medias'),
  ContactMessage: createEntityAdapter('ContactMessage', 'contact_messages'),
  TournamentConfig: createEntityAdapter('TournamentConfig', 'tournament_configs'),
  TournamentMemorial: createEntityAdapter('TournamentMemorial', 'tournament_memorials'),
  TeamKnowledgeBase: createEntityAdapter('TeamKnowledgeBase', 'team_knowledge_bases'),
};

export const adaptedEntities = new Proxy(rawEntities, {
  get(target, prop) {
    if (typeof prop === 'string' && !(prop in target)) {
      target[prop] = createEntityAdapter(prop);
    }
    return target[prop];
  }
});
