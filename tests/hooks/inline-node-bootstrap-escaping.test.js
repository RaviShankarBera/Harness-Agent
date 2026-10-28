/**
 * Inline `node -e "..."` hook bootstraps must survive every shell layer intact.
 *
 * On native Windows the command string can lose backslashes before Node sees
 * it, which turned `.replace(/\\/g,'/')` into `.replace(/\/g,'/')` and broke
 * SessionStart/SessionEnd at parse time. The scripts therefore must not rely
 * on backslash escapes beyond the `\"` used to quote the -e argument.
 *
 * Run with: node tests/hooks/inline-node-bootstrap-escaping.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    failed++;
  }
}

function inlineScripts(hookFile) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'hooks', hookFile), 'utf8'));
  const scripts = [];
  const unmatched = [];
  for (const [event, entries] of Object.entries(config.hooks || {})) {
    if (!Array.isArray(entries)) continue;
    for (const [entryIndex, entry] of entries.entries()) {
      for (const [hookIndex, hook] of (entry.hooks || []).entries()) {
        if (typeof hook.command !== 'string') continue;
        if (!/^node\s+-e\b/.test(hook.command)) continue;
        const label = `${hookFile} ${event}[${entryIndex}].hooks[${hookIndex}] ${entry.id || entry.matcher || ''}`.trim();
        const match = hook.command.match(/^node -e "((?:[^"\\]|\\.)*)"/s);
        if (match) scripts.push({ label, body: match[1] });
        else unmatched.push(label);
      }
    }
  }
  return { scripts, unmatched };
}

// Ways a shell layer may treat backslashes before Node receives the -e source.
const unescapeModes = {
  literal: body => body.replace(/\\"/g, '"'),
  'halved once': body => body.replace(/\\(["\\$`])/g, '$1'),
  'halved twice': body => body.replace(/\\(["\\$`])/g, '$1').replace(/\\\\/g, '\\'),
};

console.log('\n=== Testing inline node -e hook bootstraps ===\n');

for (const hookFile of ['hooks.json', 'codex-hooks.json']) {
  const { scripts, unmatched } = inlineScripts(hookFile);

  test(`${hookFile} has inline node -e bootstraps`, () => {
    assert.ok(scripts.length > 0, `Expected inline node -e commands in ${hookFile}`);
  });

  test(`${hookFile} every node -e command has an extractable double-quoted script`, () => {
    assert.deepStrictEqual(unmatched, [], `Could not extract inline script from: ${unmatched.join(', ')}`);
  });

  test(`${hookFile} inline scripts contain no backslash escapes other than \\"`, () => {
    for (const { label, body } of scripts) {
      const stripped = body.replace(/\\"/g, '');
      const index = stripped.indexOf('\\');
      assert.strictEqual(index, -1, `${label} has a raw backslash near: ${stripped.slice(Math.max(0, index - 30), index + 30)}`);
    }
  });

  for (const [mode, unescape] of Object.entries(unescapeModes)) {
    test(`${hookFile} inline scripts parse when backslashes are ${mode}`, () => {
      for (const { label, body } of scripts) {
        assert.doesNotThrow(() => new vm.Script(unescape(body), { filename: '[eval]' }), `${label} failed to parse`);
      }
    });
  }
}

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);

process.exit(failed > 0 ? 1 : 0);
