'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
let passed = 0;
let failed = 0;
function test(name, run) {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.stack}`); }
}
// Regression for #3746: on native Windows, Claude Code runs every hook as
// `bash.exe -c "<command>"`. The Windows argv -> MSYS -> bash double-quote layers
// each collapse backslash pairs, so any backslash inside the inline `node -e "..."`
// resolver can turn a regex literal into a SyntaxError and silently disable every
// ECC hook. The inline resolver must therefore stay backslash-free.
const BACKSLASH = String.fromCharCode(92);
const HOOK_FILES = ['hooks.json', 'codex-hooks.json'];

function inlineHookCommands(hookFile) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'hooks', hookFile), 'utf8'));
  const commands = [];
  for (const entries of Object.values(config.hooks || {})) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      for (const hook of entry.hooks || []) {
        if (typeof hook.command === 'string' && hook.command.includes('CLAUDE_CONFIG_DIR')) commands.push(hook.command);
      }
    }
  }
  return commands;
}

// Mimics the shell layers halving `\\` pairs (twice, as observed on Git Bash for Windows).
function collapseBackslashes(source) {
  const pair = BACKSLASH + BACKSLASH;
  return source.split(pair).join(BACKSLASH).split(pair).join(BACKSLASH);
}

test('INLINE_RESOLVE contains no backslashes', () => {
  const { INLINE_RESOLVE, buildInlineResolve } = require('../../scripts/lib/resolve-ecc-root');
  assert.ok(!INLINE_RESOLVE.includes(BACKSLASH), 'INLINE_RESOLVE must not contain backslashes');
  const probed = buildInlineResolve({ probe: 'scripts/auto-update.js' });
  assert.ok(!probed.includes(BACKSLASH), 'buildInlineResolve({probe}) must not contain backslashes');
});

for (const hookFile of HOOK_FILES) {
  test(`${hookFile} inline resolver commands contain no backslashes`, () => {
    const commands = inlineHookCommands(hookFile);
    assert.ok(commands.length > 0, `Expected inline resolver commands in ${hookFile}`);
    for (const command of commands) {
      assert.ok(!command.includes(BACKSLASH), `${hookFile} hook command contains a backslash: ${command.slice(0, 120)}...`);
    }
  });

  test(`${hookFile} node -e sources still parse after shell backslash collapsing`, () => {
    for (const command of inlineHookCommands(hookFile)) {
      const m = command.match(/^node -e "([^"]*)"/);
      assert.ok(m, `Could not extract node -e source from ${hookFile}`);
      assert.doesNotThrow(() => new vm.Script(collapseBackslashes(m[1])), `${hookFile} node -e source breaks after backslash collapsing`);
    }
  });
}

console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

process.exit(failed > 0 ? 1 : 0);
