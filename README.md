# AI SDK Bug Reproduction Suite

This suite tests message handling differences between AI providers to identify where the tool_use/tool_result bug occurs.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set API Keys

Create a `.env` file:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run Tests

**Test Claude (known to fail)**

```bash
npm run reproduce:claude
```

**Test OpenAI (to compare behavior)**

```bash
npm run reproduce:openai
```
Read the console output to observe the test results
