---
description: "LibreChat architecture and development patterns"
applyTo: '**/*.js, **/*.ts, **/*.jsx, **/*.tsx'
---

# LibreChat Development Guidelines

## Project Architecture

LibreChat is a full-stack AI chat application built with:

### Frontend Stack
- **React 18+** with TypeScript
- **Vite** for build tooling and HMR
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **TanStack Query** (React Query) for server state
- **Zustand** for client state management
- **React Router** for routing

### Backend Stack
- **Node.js 20+** with Express
- **MongoDB** for primary database
- **Redis** for caching and session management
- **Meilisearch** for full-text search
- **Passport.js** for authentication
- **JWT** for token-based auth

### AI/ML Integration
- **OpenAI API** (GPT models)
- **Anthropic API** (Claude)
- **Google Generative AI** (Gemini)
- **Azure OpenAI Service**
- **LangChain** for RAG and agents
- **Model Context Protocol (MCP)** for tool integration

### Infrastructure
- **Docker** and **Docker Compose** for containerization
- **Nginx** for reverse proxy
- **MongoDB 4.4+** (supports CPUs without AVX)
- **Azure Blob Storage** or **AWS S3** for file storage

## Code Organization

```
LibreChat/
├── api/                      # Backend Express API
│   ├── server/              # Server entry points
│   ├── app/                 # Express app configuration
│   ├── models/              # Mongoose models
│   ├── strategies/          # Passport auth strategies
│   └── utils/               # Utility functions
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand stores
│   │   ├── utils/          # Utility functions
│   │   └── data-provider/  # API client layer
├── packages/                # Shared packages
│   ├── data-provider/      # Shared data fetching logic
│   ├── data-schemas/       # TypeScript schemas and types
│   ├── api/                # Backend utilities
│   └── client/             # Frontend utilities
├── config/                  # Configuration scripts
└── dev-setup/              # Development environment setup
```

## Development Patterns

### Backend Patterns

**Route Structure:**
```javascript
// Use Express Router for modular routes
const router = express.Router();

router.get('/endpoint', authMiddleware, asyncHandler(async (req, res) => {
  const result = await someService(req.user.id);
  res.json(result);
}));
```

**Error Handling:**
```javascript
// Use async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error classes
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}
```

**Database Queries:**
```javascript
// Use Mongoose models with proper error handling
const Conversation = require('~/models/Conversation');

async function getConversation(conversationId, userId) {
  const conversation = await Conversation.findOne({
    conversationId,
    user: userId,
  }).lean();
  
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }
  
  return conversation;
}
```

**Authentication:**
```javascript
// Use Passport strategies consistently
passport.use(new JwtStrategy(options, async (payload, done) => {
  try {
    const user = await User.findById(payload.id);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));
```

### Frontend Patterns

**Component Structure:**
```tsx
// Use functional components with TypeScript
interface MessageProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export const Message: React.FC<MessageProps> = ({ content, role, timestamp }) => {
  return (
    <div className={cn('message', `message-${role}`)}>
      <MessageContent content={content} />
      <MessageTimestamp timestamp={timestamp} />
    </div>
  );
};
```

**Custom Hooks:**
```tsx
// Extract reusable logic into custom hooks
function useConversation(conversationId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.getConversation(conversationId),
    staleTime: 5 * 60 * 1000,
  });
  
  const updateConversation = useMutation({
    mutationFn: api.updateConversation,
    onSuccess: () => {
      queryClient.invalidateQueries(['conversation', conversationId]);
    },
  });
  
  return { conversation: data, isLoading, error, updateConversation };
}
```

**State Management:**
```tsx
// Use Zustand for global state
import { create } from 'zustand';

interface ConversationStore {
  activeConversation: string | null;
  setActiveConversation: (id: string) => void;
  conversations: Conversation[];
  addConversation: (conversation: Conversation) => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  activeConversation: null,
  conversations: [],
  setActiveConversation: (id) => set({ activeConversation: id }),
  addConversation: (conversation) =>
    set((state) => ({ conversations: [...state.conversations, conversation] })),
}));
```

**API Client:**
```tsx
// Use React Query for server state
const api = {
  async getConversations() {
    const response = await fetch('/api/conversations');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  
  async sendMessage(conversationId: string, message: string) {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return response.json();
  },
};
```

## AI Integration Patterns

### Streaming Responses
```javascript
// Backend - Stream AI responses
async function streamChatCompletion(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: req.body.messages,
    stream: true,
  });
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    res.write(`data: ${JSON.stringify({ content })}\n\n`);
  }
  
  res.write('data: [DONE]\n\n');
  res.end();
}
```

### RAG Implementation
```javascript
// Use LangChain for Retrieval Augmented Generation
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';

async function ragQuery(question, userId) {
  const embeddings = new OpenAIEmbeddings();
  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection: documentsCollection,
    indexName: 'vector_index',
  });
  
  const relevantDocs = await vectorStore.similaritySearch(question, 5);
  const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
  
  return {
    context,
    sources: relevantDocs.map(doc => doc.metadata),
  };
}
```

## Testing Standards

### Backend Tests (Vitest)
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { getConversation } from './conversationService';

describe('Conversation Service', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });
  
  it('should retrieve conversation for authorized user', async () => {
    const conversation = await getConversation('conv-123', 'user-456');
    expect(conversation).toBeDefined();
    expect(conversation.user).toBe('user-456');
  });
  
  it('should throw error for unauthorized access', async () => {
    await expect(
      getConversation('conv-123', 'wrong-user')
    ).rejects.toThrow('Not found');
  });
});
```

### Frontend Tests (React Testing Library)
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Message } from './Message';

describe('Message Component', () => {
  it('renders message content', () => {
    render(
      <Message 
        content="Hello world" 
        role="user" 
        timestamp={new Date()} 
      />
    );
    
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
  
  it('applies correct role styling', () => {
    const { container } = render(
      <Message content="Test" role="assistant" timestamp={new Date()} />
    );
    
    expect(container.firstChild).toHaveClass('message-assistant');
  });
});
```

## Performance Optimization

### Database Indexing
```javascript
// Create indexes for frequently queried fields
ConversationSchema.index({ user: 1, createdAt: -1 });
ConversationSchema.index({ conversationId: 1, user: 1 }, { unique: true });
MessageSchema.index({ conversationId: 1, createdAt: 1 });
```

### Caching Strategy
```javascript
// Use Redis for caching expensive operations
async function getCachedUserPreferences(userId) {
  const cacheKey = `user:${userId}:preferences`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const preferences = await User.findById(userId).select('preferences');
  await redis.setex(cacheKey, 3600, JSON.stringify(preferences));
  
  return preferences;
}
```

### Frontend Code Splitting
```tsx
// Lazy load heavy components
const ModelSettings = lazy(() => import('./ModelSettings'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ModelSettings />
    </Suspense>
  );
}
```

## Environment Configuration

### Development Setup
```bash
# Use docker-compose for local development
docker-compose up -d mongodb redis meilisearch

# Run backend and frontend separately for HMR
npm run backend:dev    # Backend with nodemon
npm run frontend:dev   # Frontend with Vite HMR
```

### Environment Variables
```bash
# .env.example structure
NODE_ENV=development
PORT=3080
MONGO_URI=mongodb://localhost:27017/LibreChat
REDIS_URI=redis://localhost:6379
JWT_SECRET=<randomly-generated>
JWT_REFRESH_SECRET=<randomly-generated>

# AI Provider Keys (use placeholders)
OPENAI_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-key>
AZURE_OPENAI_API_KEY=<your-key>
```

## Common Pitfalls to Avoid

1. **Don't hardcode credentials** - Always use environment variables
2. **Don't skip error handling** - Wrap async operations properly
3. **Don't forget authentication** - Protect all API routes
4. **Don't commit .env files** - Use .env.example only
5. **Don't expose internal details** - Use placeholders in examples
6. **Don't skip dependency arrays** - Fix useEffect warnings
7. **Don't ignore TypeScript errors** - Fix all type issues
8. **Don't skip testing** - Write tests for new features
9. **Don't use console.log in production** - Use proper logging
10. **Don't store secrets in localStorage** - Use httpOnly cookies

## Resources

- [LibreChat Documentation](https://docs.librechat.ai)
- [React Documentation](https://react.dev)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
