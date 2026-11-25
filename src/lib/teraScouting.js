// Shared domain rules. No database, authorization or browser side effects here.
export const SCOUTING_STATES = ['pending', 'validated', 'divergent'];
export const MISSING_OBSERVATIONS = ['not_observed', 'not_applicable', 'not_informed'];
export const SCOUTING_ROLES = ['viewer', 'scout', 'configurator', 'admin'];

export function scoutingRole(assignment) {
  return SCOUTING_ROLES.includes(assignment) ? assignment : 'viewer';
}

export function observation(value) {
  if (value === null || value === undefined || MISSING_OBSERVATIONS.includes(value)) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('INVALID_OBSERVATION');
  return value;
}

export function eventName(value, names = [], currentName = null) {
  if (typeof value !== 'string') throw new Error('EVENT_NAME_REQUIRED');
  const name = value.trim().normalize('NFC');
  if (!name || name.length > 120) throw new Error('EVENT_NAME_REQUIRED');
  const key = text => text.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
  if (names.some(existing => existing !== currentName && key(existing) === key(name))) throw new Error('EVENT_NAME_DUPLICATE');
  return name;
}

export function recordKey(record) {
  const parts = ['season_id', 'event_id', 'match_number', 'team_number'];
  if (parts.some(key => typeof record[key] !== 'string' || !record[key].trim())) throw new Error('RECORD_CONTEXT_REQUIRED');
  return JSON.stringify(parts.map(key => record[key].trim()));
}

export function validateScoutingRecord(record, context) {
  recordKey(record);
  if (record.season_id !== context.season_id || record.event_id !== context.event_id) throw new Error('EVENT_SCOPE_MISMATCH');
  if (!context.team_numbers.includes(record.team_number)) throw new Error('TEAM_NOT_IN_EVENT');
  if (!['red', 'blue'].includes(record.alliance)) throw new Error('ALLIANCE_REQUIRED');
  if (!['left', 'center', 'right'].includes(record.start_position)) throw new Error('START_POSITION_REQUIRED');
  if (!SCOUTING_STATES.includes(record.status)) throw new Error('INVALID_RECORD_STATUS');
  if (!record.responses || typeof record.responses !== 'object' || Array.isArray(record.responses)) throw new Error('RESPONSES_REQUIRED');
  for (const field of context.fields) {
    const value = Object.hasOwn(record.responses, field.id) ? record.responses[field.id] : null;
    if (value === null || value === undefined || MISSING_OBSERVATIONS.includes(value)) continue;
    if (field.type === 'boolean') {
      if (typeof value !== 'boolean') throw new Error('INVALID_BOOLEAN');
    } else if (field.type === 'counter') {
      observation(value);
      if (!Number.isSafeInteger(value)) throw new Error('INVALID_COUNTER');
    } else throw new Error('INVALID_FIELD_CONFIGURATION');
  }
  const ids = new Set(context.fields.map(field => field.id));
  if (Object.keys(record.responses).some(id => !ids.has(id))) throw new Error('UNKNOWN_RESPONSE');
  // Authenticated UUID, privileges and review status must still be enforced by the server.
  return true;
}

export function scoreResponses(responses, config) {
  if (!config?.source || !Array.isArray(config.fields) || config.fields.length === 0) return {total: null, missing: [], configured: false};
  const missing = [];
  let total = 0;
  for (const field of config.fields) {
    if (!Number.isFinite(field.points) || field.points < 0) throw new Error('INVALID_SCORING_CONFIGURATION');
    const value = responses[field.id];
    if (value === null || value === undefined || MISSING_OBSERVATIONS.includes(value)) { missing.push(field.id); continue; }
    if (field.type === 'boolean') {
      if (typeof value !== 'boolean') throw new Error('INVALID_BOOLEAN');
      total += value ? field.points : 0;
    } else if (field.type === 'counter') {
      observation(value);
      if (!Number.isSafeInteger(value)) throw new Error('INVALID_COUNTER');
      total += value * field.points;
    } else throw new Error('INVALID_FIELD_CONFIGURATION');
  }
  if (!Number.isFinite(total)) throw new Error('INVALID_SCORE');
  return {total: missing.length ? null : total, missing, configured: true};
}

export function compareObservations(first, second, fields) {
  if (recordKey(first) !== recordKey(second)) throw new Error('COMPARISON_SCOPE_MISMATCH');
  const independent = Boolean(first.scout_user_id && second.scout_user_id && first.scout_user_id !== second.scout_user_id);
  const differences = fields.filter(id => {
    const a = first.responses[id], b = second.responses[id];
    return a !== b && !(a == null && b == null);
  });
  return {independent, differences, requires_review: differences.length > 0};
}

export function summarizeScouting(records, seasonId, eventId) {
  // Independent observers are not extra matches. Only explicitly validated records contribute.
  const groups = new Map();
  for (const record of records) {
    if (record.season_id !== seasonId || record.event_id !== eventId) continue;
    const key = recordKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const scores = [], unresolved = [];
  for (const [key, group] of groups) {
    const validated = group.filter(record => record.status === 'validated');
    const values = validated.map(record => observation(record.total));
    if (!values.length || values.some(value => value === null) || new Set(values).size !== 1) { unresolved.push(key); continue; }
    scores.push(values[0]);
  }
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const deviation = scores.length > 1 ? Math.sqrt(scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length) : null;
  return {matches: groups.size, scored_matches: scores.length, unresolved, mean,
    best: scores.length ? Math.max(...scores) : null,
    consistency: deviation === null || mean === 0 ? null : Math.max(0, Math.min(100, 100 * (1 - deviation / mean)))};
}

export function dataQuality(factors, weights) {
  // Methodology: weighted mean of observed factors [0,1]; absent factors never count as perfect/zero.
  const entries = Object.entries(weights);
  if (!entries.length || entries.some(([, weight]) => !Number.isFinite(weight) || weight < 0)) throw new Error('INVALID_QUALITY_WEIGHTS');
  const configured = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (!configured) throw new Error('INVALID_QUALITY_WEIGHTS');
  let weighted = 0, covered = 0;
  for (const [key, weight] of entries) {
    const value = factors[key];
    if (value === null || value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error('INVALID_QUALITY_FACTOR');
    weighted += value * weight;
    covered += weight;
  }
  return {score: covered ? Math.round(100 * weighted / covered) : null, coverage: covered / configured,
    methodology: 'weighted_observed_factors_v1', weights: {...weights}};
}
