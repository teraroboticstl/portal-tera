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

  // Helper para mapear campos do modelo relacional e compatibilizar campos virtuais
  const mapItem = (item) => {
    if (!item) return item;

    const mapped = {
      ...item,
      created_date: item.created_at || item.created_date || null
    };

    if (actualTableName === 'robots') {
      const seasonYear = item.seasons?.year;
      const createdYear = item.created_at ? new Date(item.created_at).getFullYear() : null;
      const imagesArray = Array.isArray(item.images) ? item.images : [];

      mapped.year = item.year || seasonYear || createdYear || new Date().getFullYear();
      mapped.season_name = item.season_name || item.seasons?.theme || (seasonYear ? `Temporada ${seasonYear}` : '');
      mapped.cad_url = item.cad_url || item.cad_link || '';
      mapped.image_url = item.image_url || imagesArray[0] || '';
      mapped.extra_images = item.extra_images || (imagesArray.length > 1 ? imagesArray.slice(1) : []);
      mapped.is_current = item.is_current !== undefined ? item.is_current : (item.is_active ?? false);
      mapped.is_active = item.is_active !== undefined ? item.is_active : mapped.is_current;
      mapped.game_objective = item.game_objective || (item.specs && typeof item.specs === 'object' ? item.specs.game_objective : '') || '';
    } else if (actualTableName === 'seasons') {
      mapped.is_active = true;
    } else if (actualTableName === 'projects') {
      const baseImages = Array.isArray(item.images) ? item.images : (item.image_url ? [item.image_url] : []);
      const extraImages = Array.isArray(item.links?.extra_images) ? item.links.extra_images : [];
      mapped.images = baseImages.length > 0 ? Array.from(new Set([...baseImages, ...extraImages])) : [];
      mapped.image_url = item.image_url || mapped.images[0] || '';
      mapped.status = (item.status === 'Ativo' ? 'active' : item.status);
      mapped.link = item.link || item.links?.primary || item.links?.url || '';
      mapped.tags = Array.isArray(item.tags) ? item.tags : (item.links?.tags || []);
      mapped.date_period = item.date_period || item.links?.date_period || '';
    }

    return mapped;
  };

  const getSelectQuery = () => {
    if (actualTableName === 'robots') {
      return '*, seasons(id, year, theme)';
    }
    return '*';
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
      
      let req = supabase.from(actualTableName).select(getSelectQuery());

      let orderField = 'created_at';
      let ascending = false;

      // Suporta assinatura list('-created_date'), list('order'), etc.
      if (typeof query === 'string') {
        const cleanQuery = query.trim();
        ascending = !cleanQuery.startsWith('-');
        const rawField = cleanQuery.startsWith('-') ? cleanQuery.substring(1) : cleanQuery;
        orderField = rawField === 'created_date' ? 'created_at' : rawField;
        // Se tentar ordenar 'robots' pela coluna virtual 'year', redireciona para a coluna real 'created_at'
        if (actualTableName === 'robots' && orderField === 'year') {
          orderField = 'created_at';
        }
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
      
      let req = supabase.from(actualTableName).select(getSelectQuery());
      
      const cleanFilters = { ...filterObj };
      if (actualTableName === 'robots' && cleanFilters.is_current !== undefined) {
        cleanFilters.is_active = cleanFilters.is_current;
        delete cleanFilters.is_current;
      }
      if (actualTableName === 'seasons') {
        delete cleanFilters.is_active;
      }
      if (actualTableName === 'projects' && cleanFilters.status === 'active') {
        cleanFilters.status = 'Ativo';
      }

      // Aplicar filtros simples de igualdade
      Object.entries(cleanFilters).forEach(([key, val]) => {
        req = req.eq(key, val);
      });

      if (order) {
        const isDescending = order.startsWith('-');
        const rawField = isDescending ? order.substring(1) : order;
        let orderField = rawField === 'created_date' ? 'created_at' : rawField;
        if (actualTableName === 'robots' && orderField === 'year') {
          orderField = 'created_at';
        }
        if (actualTableName === 'seasons' && orderField === 'created_date') {
          orderField = 'created_at';
        }
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
        .select(getSelectQuery())
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

      // Sanitização específica para a tabela robots existente no schema
      if (actualTableName === 'robots') {
        if (sanitized.cad_url && !sanitized.cad_link) {
          sanitized.cad_link = sanitized.cad_url;
        }
        if (sanitized.is_current !== undefined && sanitized.is_active === undefined) {
          sanitized.is_active = sanitized.is_current;
        }
        if (sanitized.image_url && (!sanitized.images || sanitized.images.length === 0)) {
          sanitized.images = [sanitized.image_url, ...(sanitized.extra_images || [])].filter(Boolean);
        }
        if (sanitized.game_objective) {
          sanitized.specs = {
            ...(typeof sanitized.specs === 'object' && sanitized.specs !== null ? sanitized.specs : {}),
            game_objective: sanitized.game_objective
          };
        }
        delete sanitized.year;
        delete sanitized.season_name;
        delete sanitized.cad_url;
        delete sanitized.image_url;
        delete sanitized.extra_images;
        delete sanitized.is_current;
        delete sanitized.game_objective;
        delete sanitized.seasons;
      }

      if (actualTableName === 'seasons') {
        delete sanitized.is_active;
        delete sanitized.competition_date;
        delete sanitized.awards_targeted;
      }

      if (actualTableName === 'projects') {
        if (sanitized.images && Array.isArray(sanitized.images) && sanitized.images.length > 0 && !sanitized.image_url) {
          sanitized.image_url = sanitized.images[0];
        }
        if (sanitized.status === 'active') {
          sanitized.status = 'Ativo';
        }
        const existingLinks = (typeof sanitized.links === 'object' && sanitized.links !== null) ? sanitized.links : {};
        sanitized.links = {
          ...existingLinks,
          ...(sanitized.link ? { primary: sanitized.link } : {}),
          ...(sanitized.tags && sanitized.tags.length > 0 ? { tags: sanitized.tags } : {}),
          ...(sanitized.date_period ? { date_period: sanitized.date_period } : {}),
          ...(sanitized.images && sanitized.images.length > 1 ? { extra_images: sanitized.images.slice(1) } : {})
        };
        delete sanitized.images;
        delete sanitized.link;
        delete sanitized.tags;
        delete sanitized.date_period;
      }

      // Tratar strings vazias em UUIDs/Foreign Keys para null
      for (const key of Object.keys(sanitized)) {
        if ((key.endsWith('_id') || key === 'user_id') && sanitized[key] === '') {
          sanitized[key] = null;
        }
      }

      const { data, error } = await supabase
        .from(actualTableName)
        .insert([sanitized])
        .select(getSelectQuery())
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

      if (actualTableName === 'robots') {
        if (sanitized.cad_url !== undefined && !sanitized.cad_link) {
          sanitized.cad_link = sanitized.cad_url;
        }
        if (sanitized.is_current !== undefined && sanitized.is_active === undefined) {
          sanitized.is_active = sanitized.is_current;
        }
        if (sanitized.image_url !== undefined && (!sanitized.images || sanitized.images.length === 0)) {
          sanitized.images = [sanitized.image_url, ...(sanitized.extra_images || [])].filter(Boolean);
        }
        if (sanitized.game_objective !== undefined) {
          sanitized.specs = {
            ...(typeof sanitized.specs === 'object' && sanitized.specs !== null ? sanitized.specs : {}),
            game_objective: sanitized.game_objective
          };
        }
        delete sanitized.year;
        delete sanitized.season_name;
        delete sanitized.cad_url;
        delete sanitized.image_url;
        delete sanitized.extra_images;
        delete sanitized.is_current;
        delete sanitized.game_objective;
        delete sanitized.seasons;
      }

      if (actualTableName === 'seasons') {
        delete sanitized.is_active;
        delete sanitized.competition_date;
        delete sanitized.awards_targeted;
      }

      if (actualTableName === 'projects') {
        if (sanitized.images && Array.isArray(sanitized.images) && sanitized.images.length > 0) {
          sanitized.image_url = sanitized.images[0];
        }
        if (sanitized.status === 'active') {
          sanitized.status = 'Ativo';
        }
        const existingLinks = (typeof sanitized.links === 'object' && sanitized.links !== null) ? sanitized.links : {};
        sanitized.links = {
          ...existingLinks,
          ...(sanitized.link !== undefined ? { primary: sanitized.link } : {}),
          ...(sanitized.tags !== undefined ? { tags: sanitized.tags } : {}),
          ...(sanitized.date_period !== undefined ? { date_period: sanitized.date_period } : {}),
          ...(sanitized.images && sanitized.images.length > 1 ? { extra_images: sanitized.images.slice(1) } : {})
        };
        delete sanitized.images;
        delete sanitized.link;
        delete sanitized.tags;
        delete sanitized.date_period;
      }

      for (const key of Object.keys(sanitized)) {
        if ((key.endsWith('_id') || key === 'user_id') && sanitized[key] === '') {
          sanitized[key] = null;
        }
      }

      const { data, error } = await supabase
        .from(actualTableName)
        .update(sanitized)
        .eq('id', id)
        .select(getSelectQuery())
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
    },

    /**
     * Subscrição Realtime para alterações na tabela (Supabase Realtime via Postgres Changes).
     */
    subscribe(callback) {
      if (!callback || typeof callback !== 'function') {
        return () => {};
      }
      try {
        const channelName = `realtime:${actualTableName}:${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: actualTableName },
            (payload) => {
              try {
                let eventType = 'update';
                let data = mapItem(payload.new);
                let id = payload.new?.id || payload.old?.id;
                if (payload.eventType === 'INSERT') {
                  eventType = 'create';
                } else if (payload.eventType === 'DELETE') {
                  eventType = 'delete';
                  data = mapItem(payload.old);
                }
                callback({ type: eventType, data, id });
              } catch (err) {
                console.warn(`[Supabase Realtime Adapter] Erro no callback (${actualTableName}):`, err);
              }
            }
          )
          .subscribe((status, err) => {
            if (err) {
              console.warn(`[Supabase Realtime Adapter] Falha na subscrição (${actualTableName}):`, err);
            }
          });

        return () => {
          try {
            supabase.removeChannel(channel);
          } catch (err) {
            console.warn(`[Supabase Realtime Adapter] Erro ao desinscrever (${actualTableName}):`, err);
          }
        };
      } catch (err) {
        console.warn(`[Supabase Realtime Adapter] Erro ao criar canal (${actualTableName}):`, err);
        return () => {};
      }
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
