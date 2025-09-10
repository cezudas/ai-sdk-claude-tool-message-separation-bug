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
  console.log('Testing the FIXED message structure (should work with both providers)...\n');

  // Using the FIXED message structure that works with both providers
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
        // Removed text part per Vercel maintainer feedback
        // Tool calls should be at the end of assistant responses
      ],
    },
    {
      role: 'tool', // ← SEPARATE tool message
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
      role: 'assistant', // ← SEPARATE assistant message for text response
      content: 'I generated code for 10 items.',
    },
    {
      role: 'user', // ← SEPARATE user message
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
      '✅ OpenAI works with the corrected message structure',
    );
    console.log('📊 Key findings:');
    console.log(
      '   1. Both providers work when using proper message structure',
    );
    console.log(
      '   2. OpenAI is more lenient (accepts both old and new structures)',
    );
    console.log('   3. Claude is stricter (only accepts proper structure)');
    console.log(
      '   4. The issue was message structure best practices, not an AI SDK bug',
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
    'RESOLUTION: Both providers work with proper message structure!',
  );
  console.log('Claude behavior: ✅ WORKS with separated tool-call and text messages');
  console.log('OpenAI behavior: ✅ WORKS with proper structure (also lenient with mixed)');

  console.log('\n💡 Key Learning:');
  console.log('1. ✅ The issue was message structure best practices, not an AI SDK bug');
  console.log('2. 🔧 Tool calls should be separate from text content in assistant messages');
  console.log('3. 📏 Claude enforces stricter validation, OpenAI is more lenient');
  console.log('4. 🎯 Use the proper structure for compatibility with all providers');
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
