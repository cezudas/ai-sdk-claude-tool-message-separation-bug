#!/usr/bin/env node

/**
 * Simple demonstration of the AI SDK message transformation bug
 * This shows the exact input/output transformation without needing API keys
 */

console.log('=== AI SDK Message Combination Bug Demo ===\n');

console.log('PROBLEM: AI SDK incorrectly combines separate messages for Claude\n');

console.log('✅ CORRECT INPUT (what we provide to AI SDK):');
const correctInput = [
  {
    role: 'user',
    content: 'generate 10 items'
  },
  {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'tool-123', 
        name: 'json',
        input: { message: 'generate 10 items' }
      },
      { type: 'text', text: 'Generated code for 10 items.' }
    ]
  },
  {
    role: 'tool',    // ← SEPARATE message
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'tool-123',
        content: '{"code": "...", "packageJson": "{}"}'
      }
    ]
  },
  {
    role: 'user',    // ← SEPARATE message
    content: 'generate 100 items'
  }
];

correctInput.forEach((msg, i) => {
  console.log(`  Message ${i} (${msg.role}):`, 
    typeof msg.content === 'string' ? `"${msg.content}"` : '[complex content]');
});

console.log('\n❌ INCORRECT OUTPUT (what AI SDK actually sends to Claude):');
const malformedOutput = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'generate 10 items' }
    ]
  },
  {
    role: 'assistant', 
    content: [
      {
        type: 'tool_use',
        id: 'tool-123',
        name: 'json', 
        input: { message: 'generate 10 items' }
      },
      { type: 'text', text: 'Generated code for 10 items.' }
    ]
  },
  {
    role: 'user',    // ← COMBINED MESSAGE (BUG!)
    content: [
      {
        type: 'tool_result',      // ← This should be in separate role:'tool' message  
        tool_use_id: 'tool-123',
        content: '{"code": "...", "packageJson": "{}"}'
      },
      {
        type: 'text',            // ← This should be the only content
        text: 'generate 100 items'
      }
    ]
  }
];

malformedOutput.forEach((msg, i) => {
  console.log(`  Message ${i} (${msg.role}):`, 
    typeof msg.content === 'string' ? `"${msg.content}"` : '[MALFORMED: tool_result + text]');
});

console.log('\n🐛 RESULT: Claude rejects this because tool_result belongs in role:"tool" message');
console.log('   Error: "tool_use ids found without tool_result blocks immediately after"');

console.log('\n💡 SOLUTION: Patch AI SDK to NOT combine role:"tool" + role:"user" messages');
console.log('   File this as a bug report with Vercel AI SDK team');
