import { projectModalities, projectCategories, mergeProjectLinks } from '../../lib/modalities.js';
import { supabase } from '../supabaseClient.js';

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
  async function assertWriteAccess(){
    if(!["audit_logs","board_diaries","daily_logs","esg_initiatives","fll_attachments","fll_core_values","fll_innovation_projects","fll_judge_preps","fll_members","fll_missions","fll_tasks","frc_scouts","internal_projects","matches","meeting_notes","onshape_configs","pdi_frcs","pdis","priorities","project_risks","prototype_tests","scout_ftcs","team_knowledge_bases","team_logs","teams","tournament_configs","projects"].includes(actualTableName))return;
    const {data,error}=await supabase.rpc('portal_can_edit');
    if(error || data!==true)throw new Error('Seu nível permite apenas consulta. Edição restrita a membros integrados e líderes.');
  }

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

      mapped.year = item.year || seasonYear || (item.specs && item.specs.year) || createdYear || new Date().getFullYear();
      mapped.season_name = item.season_name || item.seasons?.theme || (item.specs && item.specs.season_name) || (seasonYear ? `Temporada ${seasonYear}` : '');
      mapped.cad_url = item.cad_url || item.cad_link || '';
      mapped.image_url = item.image_url || imagesArray[0] || '';
      mapped.extra_images = item.extra_images || (imagesArray.length > 1 ? imagesArray.slice(1) : []);
      mapped.is_current = item.is_current !== undefined ? item.is_current : (item.is_active ?? false);
      mapped.is_active = item.is_active !== undefined ? item.is_active : mapped.is_current;
      mapped.game_objective = item.game_objective || (item.specs && typeof item.specs === 'object' ? item.specs.game_objective : '') || '';
    } else if (actualTableName === 'seasons') {
      mapped.is_active = true;
      if (item.description && item.description.startsWith('{')) {
        try {
          const parsed = JSON.parse(item.description);
          Object.assign(mapped, parsed);
          mapped.description = parsed.custom_description || '';
          mapped.fll_missions = parsed.fll_missions || {};
          mapped.fll_audios = parsed.fll_audios || {};
        } catch (e) {
          // Mantém original se não for JSON válido
        }
      }
      mapped.program = item.program || mapped.program || 'FRC';
      mapped.season_name = item.theme || mapped.season_name || `Temporada ${mapped.year}`;
      mapped.theme = mapped.season_name;
      mapped.fll_missions = mapped.fll_missions || {};
      mapped.fll_audios = mapped.fll_audios || {};
      // Compatibilidade retroativa de datas de competição
      if (mapped.competition_date && !mapped.regional_date && !mapped.national_date && !mapped.international_date) {
        mapped.regional_date = mapped.competition_date;
      }
      // Compatibilidade retroativa de manuais antigos em important_links
      if (!Array.isArray(mapped.important_links) || mapped.important_links.length === 0) {
        const legacyLinks = [];
        if (mapped.game_manual_a) {
          legacyLinks.push({ description: 'Game Manual (Parte 1)', url: mapped.game_manual_a });
        }
        if (mapped.game_manual_b) {
          legacyLinks.push({ description: 'Game Manual (Parte 2)', url: mapped.game_manual_b });
        }
        mapped.important_links = legacyLinks;
      }
      if (!Array.isArray(mapped.awards_targeted)) {
        mapped.awards_targeted = [];
      }
    } else if (actualTableName === 'projects') {
      const baseImages = Array.isArray(item.images) ? item.images : (item.image_url ? [item.image_url] : []);
      const extraImages = Array.isArray(item.links?.extra_images) ? item.links.extra_images : [];
      mapped.images = baseImages.length > 0 ? Array.from(new Set([...baseImages, ...extraImages])) : [];
      mapped.image_url = item.image_url || mapped.images[0] || '';
      mapped.status = (item.status === 'Ativo' ? 'active' : item.status);
      mapped.link = item.link || item.links?.primary || item.links?.url || '';
      mapped.tags = Array.isArray(item.tags) ? item.tags : (item.links?.tags || []);
      mapped.date_period = item.date_period || item.links?.date_period || '';
      mapped.modalities = projectModalities(item);
      mapped.obr_categories = projectCategories(item);
    } else if (actualTableName === 'products') {
      mapped.available = item.in_stock !== undefined ? Boolean(item.in_stock) : true;
      mapped.in_stock = mapped.available;
      if (item.description && item.description.startsWith('[cat:')) {
        const match = item.description.match(/^\[cat:([^\]]+)\]\s*([\s\S]*)$/);
        if (match) {
          mapped.category = match[1];
          mapped.description = match[2];
        }
      }
    } else if (actualTableName === 'sponsors') {
      mapped.category = item.category || (
        item.tier === 'Diamante' ? 'Master' :
        item.tier === 'Ouro' ? 'Gold' :
        item.tier === 'Prata' ? 'Silver' :
        'Apoio'
      );
      mapped.tier = item.tier;
      mapped.link = item.website || item.link || '';
      mapped.website = mapped.link;
    } else if (['daily_logs', 'meeting_notes', 'priorities', 'prototype_tests'].includes(actualTableName)) {
      mapped.program = item.program || item.category || 'Geral';
      const textToCheck = item.content || item.description || item.title || '';
      const tagMatch = textToCheck.match(/\[season_tag:([^\]]+)\]/);
      if (tagMatch) {
        mapped.season_tag = tagMatch[1];
        if (mapped.content) mapped.content = mapped.content.replace(/\s*\[season_tag:[^\]]+\]/, '');
        if (mapped.description) mapped.description = mapped.description.replace(/\s*\[season_tag:[^\]]+\]/, '');
        if (mapped.title) mapped.title = mapped.title.replace(/\s*\[season_tag:[^\]]+\]/, '');
      }
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
      let programFilter = null;
      if (actualTableName === 'seasons') {
        delete cleanFilters.is_active;
        if (cleanFilters.program !== undefined) {
          cleanFilters.program = String(cleanFilters.program).toUpperCase();
        }
      }
      if (actualTableName === 'projects' && cleanFilters.status === 'active') {
        cleanFilters.status = 'Ativo';
      }
      if (actualTableName === 'products' && cleanFilters.available !== undefined) {
        cleanFilters.in_stock = Boolean(cleanFilters.available);
        delete cleanFilters.available;
      }
      if (actualTableName === 'sponsors') {
        if (cleanFilters.category !== undefined) {
          const cat = cleanFilters.category;
          cleanFilters.tier = cat === 'Master' ? 'Diamante'
            : cat === 'Gold' ? 'Ouro'
            : cat === 'Silver' ? 'Prata'
            : 'Apoio';
          delete cleanFilters.category;
        }
        if (cleanFilters.link !== undefined) {
          cleanFilters.website = cleanFilters.link;
          delete cleanFilters.link;
        }
      }

      if (['daily_logs', 'priorities', 'prototype_tests'].includes(actualTableName) && cleanFilters.program !== undefined) {
        cleanFilters.category = cleanFilters.program;
        delete cleanFilters.program;
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
      let items = mapItems(data) || [];
      if (programFilter) {
        items = items.filter(item => item.program === programFilter);
      }
      return items;
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
      await assertWriteAccess();
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
        const existingSpecs = (typeof sanitized.specs === 'object' && sanitized.specs !== null) ? sanitized.specs : {};
        sanitized.specs = {
          ...existingSpecs,
          ...(sanitized.game_objective !== undefined ? { game_objective: sanitized.game_objective } : {}),
          ...(sanitized.year !== undefined ? { year: sanitized.year } : {}),
          ...(sanitized.season_name !== undefined ? { season_name: sanitized.season_name } : {})
        };
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
        const allowedPrograms = ['OBR', 'FLL', 'FTC', 'FRC'];
        const selectedProg = sanitized.program ? String(sanitized.program).trim().toUpperCase() : 'FRC';
        sanitized.program = allowedPrograms.includes(selectedProg) ? selectedProg : 'FRC';

        sanitized.year = parseInt(sanitized.year, 10) || new Date().getFullYear();
        sanitized.theme = (sanitized.theme || sanitized.season_name || `Temporada ${sanitized.year}`).trim();

        const importantLinks = Array.isArray(sanitized.important_links) ? sanitized.important_links : [];
        const manualA = sanitized.game_manual_a || importantLinks[0]?.url || '';
        const manualB = sanitized.game_manual_b || importantLinks[1]?.url || '';

        // Preservar metadados existentes da descrição se já existiam
        let existingExtra = {};
        if (sanitized.description && typeof sanitized.description === 'string' && sanitized.description.startsWith('{')) {
          try { existingExtra = JSON.parse(sanitized.description); } catch {}
        }

        const extraFields = {
          ...existingExtra,
          program: sanitized.program,
          game_name: sanitized.game_name || sanitized.season_name || sanitized.theme,
          kickoff_date: sanitized.kickoff_date || null,
          regional_date: sanitized.regional_date || null,
          national_date: sanitized.national_date || null,
          international_date: sanitized.international_date || null,
          competition_date: sanitized.regional_date || sanitized.competition_date || sanitized.national_date || sanitized.international_date || null,
          robot_name: sanitized.robot_name || '',
          robot_weight: (sanitized.robot_weight !== undefined && sanitized.robot_weight !== null && sanitized.robot_weight !== '') ? Number(sanitized.robot_weight) : null,
          awards_targeted: Array.isArray(sanitized.awards_targeted) ? sanitized.awards_targeted : [],
          important_links: importantLinks,
          game_manual_a: manualA,
          game_manual_b: manualB,
          scoring_zones: sanitized.scoring_zones || '',
          endgame_options: sanitized.endgame_options || '',
          team_objectives: sanitized.team_objectives || '',
          custom_description: (sanitized.custom_description !== undefined) ? sanitized.custom_description : ((sanitized.description && !sanitized.description.startsWith('{')) ? sanitized.description : ''),
          fll_missions: sanitized.fll_missions !== undefined ? sanitized.fll_missions : (existingExtra.fll_missions || {}),
          fll_audios: sanitized.fll_audios !== undefined ? sanitized.fll_audios : (existingExtra.fll_audios || {})
        };
        sanitized.description = JSON.stringify(extraFields);

        // Remove rigorosamente todas as propriedades que NÃO são colunas físicas da tabela seasons no PostgreSQL
        // As colunas físicas de public.seasons são: id, program, year, theme, description, created_at, updated_at
        delete sanitized.is_active;
        delete sanitized.competition_date;
        delete sanitized.regional_date;
        delete sanitized.national_date;
        delete sanitized.international_date;
        delete sanitized.awards_targeted;
        delete sanitized.important_links;
        delete sanitized.kickoff_date;
        delete sanitized.game_name;
        delete sanitized.season_name;
        delete sanitized.robot_name;
        delete sanitized.robot_weight;
        delete sanitized.game_manual_a;
        delete sanitized.game_manual_b;
        delete sanitized.scoring_zones;
        delete sanitized.endgame_options;
        delete sanitized.team_objectives;
        delete sanitized.custom_description;
        delete sanitized.fll_missions;
        delete sanitized.fll_audios;
      }

      if (actualTableName === 'products') {
        if (sanitized.available !== undefined) {
          sanitized.in_stock = Boolean(sanitized.available);
          delete sanitized.available;
        }
        if (sanitized.price !== undefined) {
          const numPrice = parseFloat(sanitized.price);
          sanitized.price = isNaN(numPrice) ? 0 : numPrice;
        }
        const allowedCategories = ['Vestuário', 'Acessórios', 'Colecionáveis', 'Outros'];
        const frontendCategory = sanitized.category;
        if (frontendCategory && !allowedCategories.includes(frontendCategory)) {
          let mappedDbCat = 'Outros';
          if (frontendCategory === 'Camisetas') {
            mappedDbCat = 'Vestuário';
          } else if (['Canecas', 'Bottons', 'Chaveiros'].includes(frontendCategory)) {
            mappedDbCat = 'Colecionáveis';
          } else if (frontendCategory === 'Acessórios') {
            mappedDbCat = 'Acessórios';
          }
          sanitized.category = mappedDbCat;
          const rawDesc = sanitized.description || '';
          const cleanDesc = rawDesc.replace(/^\[cat:[^\]]+\]\s*/, '');
          sanitized.description = `[cat:${frontendCategory}] ${cleanDesc}`.trim();
        }
      }

      if (actualTableName === 'sponsors') {
        if (sanitized.category !== undefined || !sanitized.tier) {
          const cat = sanitized.category;
          sanitized.tier = cat === 'Master' ? 'Diamante'
            : cat === 'Gold' ? 'Ouro'
            : cat === 'Silver' ? 'Prata'
            : cat === 'Apoio' ? 'Apoio'
            : (sanitized.tier || 'Apoio');
          delete sanitized.category;
        }
        if (sanitized.link !== undefined) {
          sanitized.website = sanitized.link || null;
          delete sanitized.link;
        }
        if (sanitized.order !== undefined) {
          sanitized.order = parseInt(sanitized.order, 10) || 0;
        }
      }

      if (['daily_logs', 'meeting_notes', 'priorities', 'prototype_tests'].includes(actualTableName)) {
        if (sanitized.season_tag !== undefined) {
          const sTag = sanitized.season_tag;
          delete sanitized.season_tag;
          if (sTag) {
            if (actualTableName === 'daily_logs' || actualTableName === 'meeting_notes') {
              sanitized.content = `${sanitized.content || ''}\n[season_tag:${sTag}]`.trim();
            } else if (actualTableName === 'priorities') {
              sanitized.title = `${sanitized.title || ''} [season_tag:${sTag}]`.trim();
            } else if (actualTableName === 'prototype_tests') {
              sanitized.description = `${sanitized.description || ''}\n[season_tag:${sTag}]`.trim();
            }
          }
        }
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
          ...mergeProjectLinks(existingLinks, sanitized),
          ...(sanitized.link ? { primary: sanitized.link } : {}),
          ...(sanitized.tags && sanitized.tags.length > 0 ? { tags: sanitized.tags } : {}),
          ...(sanitized.date_period ? { date_period: sanitized.date_period } : {}),
          ...(sanitized.images && sanitized.images.length > 1 ? { extra_images: sanitized.images.slice(1) } : {})
        };
        delete sanitized.images;
        delete sanitized.link;
        delete sanitized.tags;
        delete sanitized.date_period;
        delete sanitized.modalities;
        delete sanitized.obr_categories;
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
      await assertWriteAccess();
      console.log(`[Supabase Adapter] Atualizando ID ${id} de ${entityName} no Supabase...`, payload);
      
      const sanitized = { ...payload };
      delete sanitized.id;
      delete sanitized.created_date;

      // Preserve unrelated project metadata in partial edits; the query uses the user's existing RLS.
      if (actualTableName === 'projects' && sanitized.links === undefined) {
        const { data: existing, error } = await supabase.from(actualTableName).select('links').eq('id', id).single();
        if (error) throw error;
        sanitized.links = existing?.links || {};
      }

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
        const existingSpecs = (typeof sanitized.specs === 'object' && sanitized.specs !== null) ? sanitized.specs : {};
        sanitized.specs = {
          ...existingSpecs,
          ...(sanitized.game_objective !== undefined ? { game_objective: sanitized.game_objective } : {}),
          ...(sanitized.year !== undefined ? { year: sanitized.year } : {}),
          ...(sanitized.season_name !== undefined ? { season_name: sanitized.season_name } : {})
        };
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
        let existingDescription = {};
        if (sanitized.description && typeof sanitized.description === 'string' && sanitized.description.startsWith('{')) {
          try {
            existingDescription = JSON.parse(sanitized.description);
          } catch (e) {}
        }
        const extraFields = { ...existingDescription };
        if (sanitized.program !== undefined) {
          const allowedPrograms = ['OBR', 'FLL', 'FTC', 'FRC'];
          const prog = String(sanitized.program).trim().toUpperCase();
          sanitized.program = allowedPrograms.includes(prog) ? prog : 'FRC';
          extraFields.program = sanitized.program;
        }
        if (sanitized.game_name !== undefined) extraFields.game_name = sanitized.game_name;
        if (sanitized.kickoff_date !== undefined) extraFields.kickoff_date = sanitized.kickoff_date;
        if (sanitized.regional_date !== undefined) extraFields.regional_date = sanitized.regional_date;
        if (sanitized.national_date !== undefined) extraFields.national_date = sanitized.national_date;
        if (sanitized.international_date !== undefined) extraFields.international_date = sanitized.international_date;
        if (sanitized.regional_date !== undefined || sanitized.competition_date !== undefined || sanitized.national_date !== undefined || sanitized.international_date !== undefined) {
          extraFields.competition_date = sanitized.regional_date || sanitized.competition_date || sanitized.national_date || sanitized.international_date || extraFields.competition_date || null;
        }
        if (sanitized.robot_name !== undefined) extraFields.robot_name = sanitized.robot_name;
        if (sanitized.robot_weight !== undefined) {
          extraFields.robot_weight = (sanitized.robot_weight !== '' && sanitized.robot_weight !== null) ? Number(sanitized.robot_weight) : null;
        }
        if (sanitized.awards_targeted !== undefined) extraFields.awards_targeted = sanitized.awards_targeted;
        if (sanitized.important_links !== undefined) {
          extraFields.important_links = sanitized.important_links;
          if (sanitized.important_links.length > 0) {
            extraFields.game_manual_a = sanitized.important_links[0]?.url || extraFields.game_manual_a || '';
          }
          if (sanitized.important_links.length > 1) {
            extraFields.game_manual_b = sanitized.important_links[1]?.url || extraFields.game_manual_b || '';
          }
        }
        if (sanitized.game_manual_a !== undefined) extraFields.game_manual_a = sanitized.game_manual_a;
        if (sanitized.game_manual_b !== undefined) extraFields.game_manual_b = sanitized.game_manual_b;
        if (sanitized.scoring_zones !== undefined) extraFields.scoring_zones = sanitized.scoring_zones;
        if (sanitized.endgame_options !== undefined) extraFields.endgame_options = sanitized.endgame_options;
        if (sanitized.team_objectives !== undefined) extraFields.team_objectives = sanitized.team_objectives;

        if (sanitized.custom_description !== undefined) {
          extraFields.custom_description = sanitized.custom_description;
        } else if (sanitized.description && !sanitized.description.startsWith('{')) {
          extraFields.custom_description = sanitized.description;
        }

        if (sanitized.fll_missions !== undefined) {
          extraFields.fll_missions = sanitized.fll_missions;
        }
        if (sanitized.fll_audios !== undefined) {
          extraFields.fll_audios = sanitized.fll_audios;
        }

        sanitized.description = JSON.stringify(extraFields);

        if (sanitized.season_name && !sanitized.theme) {
          sanitized.theme = sanitized.season_name;
        }
        if (sanitized.year !== undefined) {
          sanitized.year = parseInt(sanitized.year, 10) || new Date().getFullYear();
        }

        // Remove rigorosamente todas as propriedades que NÃO são colunas físicas da tabela seasons no PostgreSQL
        // As colunas físicas de public.seasons são: id, program, year, theme, description, created_at, updated_at
        delete sanitized.is_active;
        delete sanitized.competition_date;
        delete sanitized.regional_date;
        delete sanitized.national_date;
        delete sanitized.international_date;
        delete sanitized.awards_targeted;
        delete sanitized.important_links;
        delete sanitized.kickoff_date;
        delete sanitized.game_name;
        delete sanitized.season_name;
        delete sanitized.robot_name;
        delete sanitized.robot_weight;
        delete sanitized.game_manual_a;
        delete sanitized.game_manual_b;
        delete sanitized.scoring_zones;
        delete sanitized.endgame_options;
        delete sanitized.team_objectives;
        delete sanitized.custom_description;
        delete sanitized.fll_missions;
        delete sanitized.fll_audios;
      }

      if (actualTableName === 'products') {
        if (sanitized.available !== undefined) {
          sanitized.in_stock = Boolean(sanitized.available);
          delete sanitized.available;
        }
        if (sanitized.price !== undefined) {
          const numPrice = parseFloat(sanitized.price);
          sanitized.price = isNaN(numPrice) ? 0 : numPrice;
        }
        const allowedCategories = ['Vestuário', 'Acessórios', 'Colecionáveis', 'Outros'];
        const frontendCategory = sanitized.category;
        if (frontendCategory && !allowedCategories.includes(frontendCategory)) {
          let mappedDbCat = 'Outros';
          if (frontendCategory === 'Camisetas') {
            mappedDbCat = 'Vestuário';
          } else if (['Canecas', 'Bottons', 'Chaveiros'].includes(frontendCategory)) {
            mappedDbCat = 'Colecionáveis';
          } else if (frontendCategory === 'Acessórios') {
            mappedDbCat = 'Acessórios';
          }
          sanitized.category = mappedDbCat;
          const rawDesc = sanitized.description || '';
          const cleanDesc = rawDesc.replace(/^\[cat:[^\]]+\]\s*/, '');
          sanitized.description = `[cat:${frontendCategory}] ${cleanDesc}`.trim();
        }
      }

      if (actualTableName === 'sponsors') {
        if (sanitized.category !== undefined) {
          const cat = sanitized.category;
          sanitized.tier = cat === 'Master' ? 'Diamante'
            : cat === 'Gold' ? 'Ouro'
            : cat === 'Silver' ? 'Prata'
            : cat === 'Apoio' ? 'Apoio'
            : (sanitized.tier || 'Apoio');
          delete sanitized.category;
        }
        if (sanitized.link !== undefined) {
          sanitized.website = sanitized.link || null;
          delete sanitized.link;
        }
        if (sanitized.order !== undefined) {
          sanitized.order = parseInt(sanitized.order, 10) || 0;
        }
      }

      if (['daily_logs', 'meeting_notes', 'priorities', 'prototype_tests'].includes(actualTableName)) {
        if (sanitized.season_tag !== undefined) {
          const sTag = sanitized.season_tag;
          delete sanitized.season_tag;
          if (sTag) {
            if (actualTableName === 'daily_logs' || actualTableName === 'meeting_notes') {
              sanitized.content = `${sanitized.content || ''}\n[season_tag:${sTag}]`.trim();
            } else if (actualTableName === 'priorities') {
              sanitized.title = `${sanitized.title || ''} [season_tag:${sTag}]`.trim();
            } else if (actualTableName === 'prototype_tests') {
              sanitized.description = `${sanitized.description || ''}\n[season_tag:${sTag}]`.trim();
            }
          }
        }
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
          ...mergeProjectLinks(existingLinks, sanitized),
          ...(sanitized.link !== undefined ? { primary: sanitized.link } : {}),
          ...(sanitized.tags !== undefined ? { tags: sanitized.tags } : {}),
          ...(sanitized.date_period !== undefined ? { date_period: sanitized.date_period } : {}),
          ...(sanitized.images && sanitized.images.length > 1 ? { extra_images: sanitized.images.slice(1) } : {})
        };
        delete sanitized.images;
        delete sanitized.link;
        delete sanitized.tags;
        delete sanitized.date_period;
        delete sanitized.modalities;
        delete sanitized.obr_categories;
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
      await assertWriteAccess();
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
