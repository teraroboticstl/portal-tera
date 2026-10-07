import test from 'node:test';
import assert from 'node:assert/strict';
import { MODALITIES, OBR_CATEGORIES, matchesProject, projectCategories, projectModalities, matchesProgram, mergeProjectLinks, initialProgram } from '../src/lib/modalities.js';

test('Social projects support one, multiple and all modalities without classifying legacy projects', () => {
  assert.deepEqual(projectModalities({}), []);
  assert.equal(matchesProject({}, 'unassigned'), true);
  assert.equal(matchesProject({}, 'OBR'), false);
  const multi = { links: { modalities: ['OBR', 'FLL'], obr_categories: [OBR_CATEGORIES[0], OBR_CATEGORIES[3]] } };
  assert.equal(matchesProject(multi, 'OBR'), true);
  assert.equal(matchesProject(multi, 'FLL'), true);
  assert.equal(matchesProject(multi, 'FTC'), false);
  assert.equal(matchesProject(multi, OBR_CATEGORIES[0]), true);
  assert.equal(matchesProject(multi, OBR_CATEGORIES[1]), false);
  for (const m of [...MODALITIES, ...OBR_CATEGORIES]) assert.equal(matchesProject({ modalities: ['all'] }, m), true);
});
test('Project link metadata preserves Drive assets and editorial fields across relationship edits', () => {
  const links = { primary: 'https://example.com', extra_images: ['/api/media/existingFile'], custom: { text: 'keep' }, modalities: ['FTC'], obr_categories: [] };
  const result = mergeProjectLinks(links, { modalities: ['OBR', 'FLL'], obr_categories: [OBR_CATEGORIES[2]] });
  assert.deepEqual(result.extra_images, links.extra_images);
  assert.deepEqual(result.custom, links.custom);
  assert.equal(result.primary, links.primary);
  assert.deepEqual(result.modalities, ['OBR', 'FLL']);
  assert.deepEqual(projectCategories(result), [OBR_CATEGORIES[2]]);
  assert.deepEqual(mergeProjectLinks(result, { modalities: [], obr_categories: [] }).modalities, []);
  assert.deepEqual(mergeProjectLinks(links, {}).modalities, ['FTC']);
});
test('OBR aggregation includes all four subcategories and exact filters remain isolated', () => {
  for (const c of OBR_CATEGORIES) {
    assert.equal(matchesProgram(c, 'OBR'), true);
    assert.equal(matchesProgram(c, c), true);
    assert.equal(matchesProgram(c, 'FLL'), false);
  }
  assert.equal(matchesProgram(OBR_CATEGORIES[0], OBR_CATEGORIES[1]), false);
  assert.equal(initialProgram('?program='+encodeURIComponent(OBR_CATEGORIES[2])), OBR_CATEGORIES[2]);
  assert.equal(initialProgram('?program=unexpected'), 'all');
});
