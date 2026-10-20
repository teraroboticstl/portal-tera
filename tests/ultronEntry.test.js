import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transform } from 'sucrase';

test('floating ULTRON entry requires current internal authorization and never invokes legacy AI', () => {
  const source = fs.readFileSync(new URL('../src/components/fll/TerAIChat.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /InvokeLLM|TeamKnowledgeBase|knowledgeContext|fetch\(|\.list\(|\.insert\(|\.update\(/);
  const wrapper = ({ children }) => React.createElement('div', null, children);
  let auth;
  const mocks = {
    react: React, 'lucide-react': { Bot: () => null },
    '@/lib/AuthContext': { useAuth: () => auth },
    '@/components/ui/button': { Button: ({ children, ...props }) => React.createElement('button', props, children) },
    '@/components/ui/dialog': Object.fromEntries(['Dialog','DialogTrigger','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(name => [name, wrapper])),
    '@/components/internal/UltronReadOnlySearch': { __esModule: true, default: ({ user }) => React.createElement('p', null, `Consulta autorizada ${user.access_level}`) },
    '@/pages/AVA.css': {}
  };
  const code = transform(source, { transforms: ['jsx', 'imports'] }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require(name) { assert.ok(name in mocks, name); return mocks[name]; } });
  for (const level of ['public', 'student', 'trainee', 'member', 'leader']) {
    const internal = ['trainee', 'member', 'leader'].includes(level);
    auth = { isAuthenticated: level !== 'public', user: { id: 'synthetic', access_level: level, portal_internal: internal } };
    const html = renderToStaticMarkup(React.createElement(module.exports.default));
    if (internal) { assert.match(html, /Abrir ULTRON/); assert.match(html, /Consulta autorizada/); }
    else assert.equal(html, '');
  }
  auth = { isAuthenticated: false, user: { portal_internal: true } };
  assert.equal(renderToStaticMarkup(React.createElement(module.exports.default)), '');
});
