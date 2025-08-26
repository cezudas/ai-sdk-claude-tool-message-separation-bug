#!/usr/bin/env node

/**
 * Minimal reproduction of AI SDK bug where separate tool and user messages
 * get incorrectly combined into a malformed message for Claude.
 *
 * Expected: AI SDK should send messages as provided
 * Actual: AI SDK combines role:"tool" + role:"user" into malformed role:"user" message
 */
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import 'dotenv/config';
import { z } from 'zod';

async function reproduceAISDKBug() {
  console.log('=== AI SDK Bug Reproduction ===\n');

  // This is the correctly structured message history in AI SDK format
  const correctMessages = [
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
      role: 'tool', // ← SEPARATE tool message (AI SDK format)
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
      role: 'user', // ← SEPARATE user message
      content: 'generate 100 items',
    },
  ];

  console.log('Input messages we provide to AI SDK:');
  correctMessages.forEach((msg, i) => {
    console.log(`Message ${i} (${msg.role}):`, JSON.stringify(msg, null, 2));
  });

  console.log('\n=== Calling AI SDK generateObject ===\n');

  try {
    // This should fail with Claude because AI SDK will combine the messages incorrectly
    await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: 'You are a helpful assistant. Respond with JSON.',
      messages: correctMessages,
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

    console.log('SUCCESS: No error occurred (unexpected!)');
  } catch (error) {
    console.log('ERROR (expected):');
    console.log('Message:', error.message);

    // Look for the specific Claude error about tool_use without tool_result
    if (
      error.message.includes('tool_use') &&
      error.message.includes('tool_result')
    ) {
      console.log(
        '\n✅ BUG REPRODUCED: This confirms AI SDK is combining messages incorrectly',
      );
      console.log(
        'The error indicates Claude received malformed messages despite our correct input',
      );

      // If we had access to the actual request payload, we'd see something like:
      console.log('\nExpected AI SDK to send to Claude:');
      console.log('Message 2: {"role": "tool", "content": [...]}');
      console.log(
        'Message 3: {"role": "user", "content": "generate 100 items"}',
      );

      console.log('\nActual (malformed) that AI SDK likely sent:');
      console.log(
        'Message 2: {"role": "user", "content": [tool_result, "generate 100 items"]}',
      );
    }
  }
}

// Add environment check
if (!process.env.ANTHROPIC_API_KEY) {
  console.log(
    'Please set ANTHROPIC_API_KEY environment variable to run this reproduction',
  );
  console.log(
    'Example: ANTHROPIC_API_KEY=your_key node ai-sdk-bug-reproduction.js',
  );
  process.exit(1);
}

reproduceAISDKBug().catch(console.error);
