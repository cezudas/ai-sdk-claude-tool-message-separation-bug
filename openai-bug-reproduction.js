#!/usr/bin/env node

/**
 * OpenAI Bug Reproduction Test - Compare with Claude behavior
 *
 * This tests the same message structure with OpenAI to see if:
 * 1. OpenAI accepts the combined tool_result + user messages that Claude rejects
 * 2. The AI SDK transformation affects all providers or just Claude
 * 3. Whether this is a Claude-specific strictness issue
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import 'dotenv/config';
import { z } from 'zod';

async function testOpenAIBehavior() {
  console.log('=== OpenAI Message Handling Test ===\n');
  console.log('Testing same message structure that fails with Claude...\n');

  // Same message structure that causes Claude to fail
  const testMessages = [
    {
      role: 'user',
      content: 'generate 10 items',
    },
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: 'tool-example-123',
          toolName: 'json',
          input: { message: 'generate 10 items' },
        },
        {
          type: 'text',
          text: 'I generated code for 10 items.',
        },
      ],
    },
    {
      role: 'tool', // ← SEPARATE tool message (same as Claude test)
      content: [
        {
          type: 'tool-result',
          toolCallId: 'tool-example-123',
          toolName: 'json',
          output: {
            type: 'json',
            value: {
              code: 'export const code = () => [...]',
              packageJson: '{}',
            },
          },
        },
      ],
    },
    {
      role: 'user', // ← SEPARATE user message (same as Claude test)
      content: 'generate 100 items',
    },
  ];

  console.log('📥 INPUT MESSAGES (identical to Claude test):');
  testMessages.forEach((msg, i) => {
    console.log(`Message ${i} (${msg.role}):`, JSON.stringify(msg, null, 2));
  });

  console.log('\n=== Calling OpenAI with AI SDK ===\n');

  try {
    const result = await generateObject({
      model: openai('gpt-4.1'), // Use GPT-4
      system: 'You are a helpful assistant. Respond with JSON.',
      messages: testMessages,
      tools: {
        json: {
          description: 'Generate JSON response',
          parameters: z.object({
            message: z.string(),
          }),
        },
      },
      schema: z.object({
        response: z.string().describe('Your response to the user'),
      }),
    });

    console.log('✅ SUCCESS: OpenAI accepted the messages!');
    console.log('Response:', result.object.response);

    console.log('\n🔍 ANALYSIS:');
    console.log(
      '✅ OpenAI handled the same message structure that Claude rejects',
    );
    console.log('📊 This suggests:');
    console.log(
      '   1. The AI SDK transformation may be the same for both providers',
    );
    console.log(
      '   2. OpenAI is more lenient with tool_result message placement',
    );
    console.log('   3. Claude has stricter validation requirements');
    console.log(
      '   4. The bug may be Claude-specific validation, not AI SDK transformation',
    );
  } catch (error) {
    console.log('❌ ERROR (unexpected for OpenAI):');
    console.log('Message:', error.message);

    console.log('\n🔍 ANALYSIS:');
    if (error.message.includes('tool') && error.message.includes('result')) {
      console.log(
        '🐛 Same error as Claude - this confirms AI SDK bug affects all providers',
      );
    } else {
      console.log(
        '🤔 Different error - OpenAI has different validation than Claude',
      );
      console.log(
        '📊 This suggests the issue may be provider-specific handling',
      );
    }
  }
}

async function compareWithClaude() {
  console.log('\n=== Comparison Summary ===');
  console.log(
    'Claude behavior: REJECTS with "tool_use ids found without tool_result blocks"',
  );
  console.log('OpenAI behavior: [see results above]');

  console.log('\n💡 Key Questions:');
  console.log('1. Does OpenAI accept what Claude rejects?');
  console.log('2. Is this a Claude validation strictness issue?');
  console.log('3. Or does AI SDK transform messages differently per provider?');
}

// Environment check
if (!process.env.OPENAI_API_KEY) {
  console.log(
    'Please set OPENAI_API_KEY environment variable to run this test',
  );
  console.log(
    'Example: OPENAI_API_KEY=your_key node openai-bug-reproduction.js',
  );
  console.log('\nAlternatively, add it to your .env file:');
  console.log('OPENAI_API_KEY=your_key_here');
  process.exit(1);
}

testOpenAIBehavior()
  .then(() => compareWithClaude())
  .catch(console.error);
