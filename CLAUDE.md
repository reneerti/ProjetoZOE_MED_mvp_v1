# CLAUDE.md - AI Assistant Guide for ProjetoZOE_MED MVP v1

## Project Overview

**ProjetoZOE_MED** is a comprehensive medical health monitoring application that helps users track their health metrics, medications, supplements, lab exams, body composition, and wearable device data. The platform includes AI-powered insights, recommendations, and monitoring capabilities.

**Project Type:** Single Page Application (SPA) with Progressive Web App (PWA) capabilities
**Primary Users:** Patients, Healthcare Controllers, and Administrators
**Built With:** Lovable.dev platform
**Project URL:** https://lovable.dev/projects/378c3af3-60ed-4d53-80ce-fb739d9809e7

---

## Technology Stack

### Frontend
- **React 18.3.1** - UI framework with hooks
- **TypeScript 5.8.3** - Type safety (relaxed strict mode)
- **Vite 5.4.19** - Build tool with HMR
- **React Router DOM 6.30.1** - Client-side routing

### UI & Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **shadcn/ui** - 51 pre-built accessible components
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library
- **Class Variance Authority (CVA)** - Component variants
- **next-themes** - Dark/light mode theming

### State Management
- **TanStack React Query 5.83.0** - Server state management
- **React Hook Form 7.61.1** - Form state management
- **Zod 4.1.12** - Schema validation
- **Browser Storage** - localStorage for persistence

### Backend & Database
- **Supabase** - PostgreSQL database + Auth + Edge Functions
- **@supabase/supabase-js 2.79.0** - Client SDK
- **26 Edge Functions** - Serverless API endpoints

### Key Libraries
- **Recharts 2.15.4** - Data visualization
- **date-fns 3.6.0** - Date manipulation
- **Sonner 1.7.4** - Toast notifications
- **DOMPurify 3.3.0** - XSS protection
- **Workbox 7.3.0** - Service worker/PWA

---

## Directory Structure

```
ProjetoZOE_MED_mvp_v1/
├── src/
│   ├── components/          # React components (143 files)
│   │   ├── ui/             # shadcn/ui components (51 files)
│   │   ├── admin/          # Admin dashboard components
│   │   ├── bioimpedance/   # Body composition module
│   │   ├── medication/     # Medication tracking
│   │   ├── supplements/    # Supplement management
│   │   ├── wearables/      # Wearable device integration
│   │   ├── controller/     # Healthcare controller views
│   │   └── timeline/       # Timeline visualizations
│   ├── pages/              # Route pages (4 files)
│   │   ├── Index.tsx       # Main app shell (22 views)
│   │   ├── Auth.tsx        # Login/signup
│   │   ├── MetricsEvolution.tsx
│   │   └── NotFound.tsx
│   ├── hooks/              # Custom React hooks (16 files)
│   ├── lib/                # Utilities & validation
│   ├── integrations/       # External integrations
│   │   └── supabase/       # Supabase client & types
│   ├── types/              # TypeScript type definitions
│   ├── assets/             # Logo & icon files
│   └── index.css           # Global styles & CSS variables
├── supabase/
│   ├── functions/          # Edge Functions (26 functions)
│   ├── migrations/         # Database migrations (15+)
│   └── config.toml         # Supabase configuration
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js              # Service worker
│   └── *.png              # App icons
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json         # shadcn/ui config
└── .env                    # Environment variables
```

---

## Architecture Patterns

### 1. Single Page Application with Internal Routing

The app uses a **view-based navigation system** instead of traditional route-based navigation:

```typescript
// 22 different views defined in src/types/views.ts
export type View =
  | "dashboard" | "exams" | "exams-by-date" | "health-dashboard"
  | "myexams" | "bioimpedance" | "medication" | "medication-dashboard"
  | "evolution" | "profile" | "goals" | "resources" | "supplements"
  | "exam-charts" | "alerts" | "period-comparison" | "patient-timeline"
  | "admin" | "controller" | "wearables" | "ai-monitoring";
```

**Key Implementation Details:**
- `Index.tsx` manages view state with `currentView` useState
- Views persist in localStorage: `localStorage.setItem('currentView', currentView)`
- Components receive `onNavigate` prop to change views
- Example: `<Dashboard onNavigate={setCurrentView} currentView={currentView} />`

### 2. Feature-Based Component Organization

Components are grouped by domain/feature, not technical role:

```
components/
├── bioimpedance/           # All bioimpedance-related components
│   ├── BioimpedanceOCRUpload.tsx
│   ├── BioimpedanceMeasurementForm.tsx
│   └── BioimpedanceHistory.tsx
├── medication/             # All medication components
│   ├── MedicationForm.tsx
│   └── MedicationCard.tsx
└── supplements/            # All supplement components
    ├── SupplementCard.tsx
    └── SupplementHistory.tsx
```

### 3. Custom Hooks for Shared Logic

Extract reusable logic into hooks in `src/hooks/`:

```typescript
// src/hooks/useAuth.tsx
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth state management
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading, signOut, hasRole };
};
```

### 4. React Query for Server State

Use React Query for all data fetching with automatic caching and refetching:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['medications', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  },
  enabled: !!userId,
  refetchInterval: 30000, // Auto-refetch every 30s
});

// Mutations
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (newMedication) => {
    const { data, error } = await supabase
      .from('medications')
      .insert(newMedication);
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['medications'] });
    toast.success('Medication added successfully');
  },
});
```

### 5. Form Management with React Hook Form + Zod

All forms use React Hook Form with Zod validation:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema
const medicationSchema = z.object({
  medication_name: z.string().min(1, "Name is required").max(200),
  current_dose: z.string().regex(/^[\d.,]+\s*[a-zA-Zµμ]+$/, "Invalid dose format"),
  medication_type: z.enum(["oral", "injectable", "glp1"]),
});

// Use in component
const form = useForm({
  resolver: zodResolver(medicationSchema),
  defaultValues: {
    medication_name: "",
    current_dose: "",
    medication_type: "oral",
  },
});

const onSubmit = async (values: z.infer<typeof medicationSchema>) => {
  // Handle submission
};
```

---

## Code Conventions

### Import Path Aliases

**Always use path aliases** (configured in `tsconfig.json` and `vite.config.ts`):

```typescript
// ✅ Correct - use aliases
import { Dashboard } from "@/components/Dashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ❌ Incorrect - avoid relative paths
import { Dashboard } from "../../components/Dashboard";
```

### File Naming Conventions

- **Components:** PascalCase - `Dashboard.tsx`, `HealthScoreCard.tsx`
- **Hooks:** camelCase with `use` prefix - `useAuth.tsx`, `useWearables.tsx`
- **Pages:** PascalCase - `Index.tsx`, `Auth.tsx`
- **Utils:** camelCase - `utils.ts`, `validation.ts`
- **Types:** camelCase - `views.ts`, `database.types.ts`

### TypeScript Guidelines

The project uses **relaxed TypeScript settings**:
- `strict: false` - No strict type checking
- `noImplicitAny: false` - `any` types allowed
- `noUnusedLocals: false` - Unused variables allowed

**However, still prefer:**
- Explicit types for function parameters and return values
- Interfaces for component props
- Type assertions only when necessary
- Zod schemas for runtime validation

### Component Structure

Follow this pattern for all components:

```typescript
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// 1. Define types/interfaces
interface MyComponentProps {
  userId: string;
  onNavigate: (view: View) => void;
}

// 2. Component function with explicit props type
export const MyComponent = ({ userId, onNavigate }: MyComponentProps) => {
  // 3. Hooks (state, queries, mutations)
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-data', userId],
    queryFn: async () => { /* ... */ },
  });

  // 4. Event handlers
  const handleAction = async () => {
    try {
      setLoading(true);
      // Perform action
      toast.success('Action completed');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  // 5. Early returns for loading/error states
  if (isLoading) return <div>Loading...</div>;

  // 6. JSX return
  return (
    <div className="space-y-4">
      <Button onClick={handleAction} disabled={loading}>
        Action
      </Button>
    </div>
  );
};
```

### Styling Conventions

Use **Tailwind CSS classes** with the `cn()` utility for conditional classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class p-4 rounded-md",
  isActive && "bg-primary text-primary-foreground",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>
  Content
</div>
```

**Available CSS Variables:**
```css
/* Colors */
--primary: 195 82% 42%
--secondary: 205 65% 50%
--success: 142 50% 45%
--warning: 38 70% 55%
--destructive: 0 65% 55%

/* Feature-specific gradients */
--gradient-primary
--gradient-exams
--gradient-bioimpedance
--gradient-medication
--gradient-supplements

/* Sizing */
--radius: 0.75rem
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04)...
```

---

## Database Operations

### Supabase Client Setup

```typescript
import { supabase } from '@/integrations/supabase/client';
```

The client is pre-configured with:
- Auto-refreshing authentication tokens
- Session persistence in localStorage
- Type-safe database operations

### Type-Safe Database Queries

Use auto-generated types from `src/integrations/supabase/types.ts`:

```typescript
import type { Database } from '@/integrations/supabase/types';

// Tables have Row, Insert, and Update types
type Medication = Database['public']['Tables']['medications']['Row'];
type MedicationInsert = Database['public']['Tables']['medications']['Insert'];
type MedicationUpdate = Database['public']['Tables']['medications']['Update'];

// Select query
const { data, error } = await supabase
  .from('medications')
  .select('*')
  .eq('user_id', userId);

// Insert
const { data, error } = await supabase
  .from('medications')
  .insert({
    user_id: userId,
    medication_name: 'Aspirin',
    current_dose: '100mg',
  });

// Update
const { data, error } = await supabase
  .from('medications')
  .update({ active: false })
  .eq('id', medicationId);

// Delete
const { data, error } = await supabase
  .from('medications')
  .delete()
  .eq('id', medicationId);
```

### Parallel Data Fetching

For performance, fetch independent data in parallel using `Promise.all()`:

```typescript
const [profileResult, medicationsResult, bioimpedanceResult] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', userId).single(),
  supabase.from('medications').select('*').eq('user_id', userId),
  supabase.from('bioimpedance_measurements').select('*').eq('user_id', userId),
]);
```

### Key Database Tables

**User & Auth:**
- `profiles` - User profiles and settings
- `user_roles` - Role assignments (admin, user, controller)

**Health Data:**
- `exam_results` - Lab exam metadata
- `exam_images` - Lab exam files/images
- `bioimpedance_measurements` - Body composition data
- `medications` - Active medications
- `supplements` - Supplement tracking
- `health_goals` - User health goals
- `supplement_intake_log` - Supplement intake history
- `medication_logs` - Medication intake history

**AI & Monitoring:**
- `ai_alert_history` - AI-generated alerts
- `ai_recommendations` - AI recommendations
- `ai_performance_metrics` - AI model performance
- `ai_circuit_breaker_config` - Circuit breaker settings
- `ai_autotuning_config` - Auto-tuning configuration

**Wearables:**
- `wearable_connections` - Connected devices
- `wearable_data` - Wearable device data (steps, heart rate, etc.)

**Admin:**
- `admin_audit_logs` - Audit trail
- `webhook_subscriptions` - Webhook configurations

---

## Authentication & Authorization

### Using Authentication

```typescript
import { useAuth } from '@/hooks/useAuth';

export const MyComponent = () => {
  const { user, session, loading, signOut, hasRole } = useAuth();

  // Check authentication
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  // Check roles
  useEffect(() => {
    const checkPermissions = async () => {
      const isAdmin = await hasRole('admin');
      if (isAdmin) {
        // Admin-only logic
      }
    };
    checkPermissions();
  }, []);

  return <div>Authenticated content</div>;
};
```

### Available Roles

- **admin** - Full system access, user management
- **controller** - Healthcare provider access to patient data
- **user** - Standard patient access (default)

### Auth Configuration

Located in `supabase/config.toml`:
```toml
[auth]
enable_signup = true
enable_confirmations = false  # No email confirmation required

[auth.password]
min_length = 3
required_characters = []  # Allows numeric-only passwords
```

---

## Common Development Tasks

### Adding a New Component

1. Create component file in appropriate directory:
```typescript
// src/components/my-feature/MyNewComponent.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface MyNewComponentProps {
  title: string;
  onNavigate: (view: View) => void;
}

export const MyNewComponent = ({ title, onNavigate }: MyNewComponentProps) => {
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <Button onClick={() => onNavigate('dashboard')}>
        Back to Dashboard
      </Button>
    </Card>
  );
};
```

2. Import and use in parent component:
```typescript
import { MyNewComponent } from '@/components/my-feature/MyNewComponent';
```

### Adding a New View

1. Add view type to `src/types/views.ts`:
```typescript
export type View =
  | "dashboard"
  | "my-new-view"  // Add here
  | "exams"
  // ... other views
```

2. Add view handling in `src/pages/Index.tsx`:
```typescript
const renderView = () => {
  switch (currentView) {
    case "my-new-view":
      return <MyNewViewComponent onNavigate={setCurrentView} />;
    // ... other cases
  }
};
```

3. Create navigation to the view:
```typescript
<Button onClick={() => setCurrentView('my-new-view')}>
  Go to New View
</Button>
```

### Creating a Custom Hook

```typescript
// src/hooks/useMyFeature.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMyFeature = (userId: string) => {
  const [localState, setLocalState] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-feature', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    // Side effects
  }, [data]);

  return {
    data,
    isLoading,
    error,
    localState,
    setLocalState,
  };
};
```

### Adding a Database Migration

1. Create migration file in `supabase/migrations/`:
```sql
-- 20251128_add_new_table.sql
create table if not exists public.my_new_table (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Add RLS policies
alter table public.my_new_table enable row level security;

create policy "Users can view their own records"
  on public.my_new_table for select
  using (auth.uid() = user_id);

create policy "Users can insert their own records"
  on public.my_new_table for insert
  with check (auth.uid() = user_id);
```

2. Apply migration:
```bash
supabase db push
```

3. Regenerate types:
```bash
supabase gen types typescript --project-id irlfnzxmeympvsslbnwn > src/integrations/supabase/types.ts
```

### Adding a Supabase Edge Function

1. Create function directory:
```bash
mkdir -p supabase/functions/my-function
```

2. Create function file:
```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Function logic here
    const { data, error } = await supabase
      .from('my_table')
      .select('*');

    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

3. Deploy function:
```bash
supabase functions deploy my-function
```

### Working with Forms

Use the established pattern with React Hook Form + Zod:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  email: z.string().email("Invalid email"),
  age: z.number().min(0).max(120).optional(),
});

export const MyForm = () => {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      age: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log(values);
    // Handle submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};
```

---

## UI Components (shadcn/ui)

### Available Components

The project includes 51 pre-built accessible components from shadcn/ui in `src/components/ui/`:

**Layout:**
- Card, Separator, ScrollArea, ResizablePanel, Tabs, Accordion, Collapsible

**Forms:**
- Form, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Label

**Buttons & Actions:**
- Button, DropdownMenu, ContextMenu, Menubar, NavigationMenu, Toggle, ToggleGroup

**Overlays:**
- Dialog, AlertDialog, Sheet, Popover, HoverCard, Tooltip, Toast, Drawer

**Display:**
- Avatar, Badge, Progress, Skeleton, Calendar, Carousel, AspectRatio

**Advanced:**
- Command, Sonner (toast notifications), InputOTP

### Using UI Components

```typescript
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Example = () => (
  <Card>
    <CardHeader>
      <CardTitle>Title</CardTitle>
      <CardDescription>Description</CardDescription>
    </CardHeader>
    <CardContent>
      <p>Content here</p>
      <Badge variant="success">Active</Badge>
    </CardContent>
    <CardFooter>
      <Button>Action</Button>
    </CardFooter>
  </Card>
);
```

### Component Variants

Many components support variants via CVA:

```typescript
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

---

## Theming & Styling

### CSS Variable System

All theme colors are defined as CSS variables in `src/index.css`:

```css
:root {
  --primary: 195 82% 42%;
  --secondary: 205 65% 50%;
  --success: 142 50% 45%;
  --warning: 38 70% 55%;
  --destructive: 0 65% 55%;
}

.dark {
  --primary: 195 82% 55%;
  /* Dark mode overrides */
}
```

### Using Theme System

```typescript
import { useTheme } from "next-themes";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      Toggle Theme
    </Button>
  );
};
```

### Feature-Specific Gradients

Use predefined gradients for consistency:

```typescript
<div className="bg-gradient-to-r from-[hsl(var(--gradient-exams))]">
  Exams Section
</div>

// Or use the CSS variable directly
<div style={{ background: 'var(--gradient-bioimpedance)' }}>
  Bioimpedance Section
</div>
```

### Animation Classes

Available Tailwind animations:

```typescript
<div className="animate-fade-in">Fades in from bottom</div>
<div className="animate-slide-in-right">Slides from right</div>
<div className="animate-slide-in-left">Slides from left</div>
<div className="animate-scale-in">Scales up</div>
<div className="animate-pulse-glow">Pulsing glow effect</div>
<div className="animate-accordion-down">Accordion expand</div>
```

---

## Error Handling

### Toast Notifications

Use Sonner for all user-facing notifications:

```typescript
import { toast } from 'sonner';

// Success
toast.success('Operation completed successfully');

// Error
toast.error('Something went wrong');

// Loading
const loadingToast = toast.loading('Processing...');
// Later:
toast.success('Done!', { id: loadingToast });

// Custom
toast('Custom message', {
  description: 'Additional details',
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
});
```

### Error Boundaries

```typescript
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');

  if (error) throw error;

  // Success handling
  toast.success('Data loaded');
} catch (error) {
  console.error('Error loading data:', error);
  toast.error('Failed to load data. Please try again.');
}
```

### XSS Protection

Use DOMPurify for rendering user-generated HTML:

```typescript
import { renderSafeMarkdown } from '@/lib/utils';

// Safe HTML rendering
<div
  dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(userContent) }}
/>
```

---

## Performance Best Practices

### 1. Parallel Data Fetching

Fetch independent data sources in parallel:

```typescript
const [data1, data2, data3] = await Promise.all([
  supabase.from('table1').select('*'),
  supabase.from('table2').select('*'),
  supabase.from('table3').select('*'),
]);
```

### 2. React Query Caching

Leverage automatic caching with appropriate `queryKey` and `refetchInterval`:

```typescript
const { data } = useQuery({
  queryKey: ['medications', userId],  // Unique key
  queryFn: fetchMedications,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  refetchInterval: 30000,     // Refetch every 30s
});
```

### 3. Image Compression

Use the image compression utility for uploads:

```typescript
import { compressImage } from '@/lib/imageCompression';

const handleImageUpload = async (file: File) => {
  const compressed = await compressImage(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
  });

  // Upload compressed image
};
```

### 4. Lazy Loading

Use React.lazy for code splitting on larger features:

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('@/components/HeavyComponent'));

<Suspense fallback={<div>Loading...</div>}>
  <HeavyComponent />
</Suspense>
```

### 5. Memo for Expensive Renders

```typescript
import { memo } from 'react';

export const ExpensiveComponent = memo(({ data }) => {
  // Expensive rendering logic
  return <div>{/* ... */}</div>;
});
```

---

## Testing

### Current State

The project currently has **no test framework configured**.

### Recommended Testing Setup

If adding tests, consider:

**Unit Tests:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Component Tests:**
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

**E2E Tests:**
```bash
npm install -D playwright
```

---

## Development Workflow

### Starting Development

```bash
# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev

# Run linter
npm run lint
```

### Environment Variables

Required in `.env`:
```env
VITE_SUPABASE_PROJECT_ID="irlfnzxmeympvsslbnwn"
VITE_SUPABASE_PUBLISHABLE_KEY="your-key-here"
VITE_SUPABASE_URL="https://irlfnzxmeympvsslbnwn.supabase.co"
```

### Building for Production

```bash
# Production build
npm run build

# Development build (with source maps)
npm run build:dev

# Preview production build
npm run preview
```

### Deployment

The project is built with Lovable.dev:
1. Open https://lovable.dev/projects/378c3af3-60ed-4d53-80ce-fb739d9809e7
2. Navigate to Share → Publish
3. Deploy to production

Alternatively, deploy the `dist/` folder to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting service

---

## Git Workflow

### Branch Strategy

- `main` - Production branch
- `claude/session-*` - AI assistant feature branches
- Feature branches should be created for new features

### Commit Messages

Follow conventional commits format:

```bash
feat: add medication reminder feature
fix: resolve bioimpedance chart rendering issue
docs: update CLAUDE.md with new patterns
refactor: simplify authentication hook
style: format Dashboard component
```

### Common Git Operations

```bash
# Check status
git status

# Create feature branch
git checkout -b feature/my-feature

# Stage and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push -u origin feature/my-feature
```

---

## Debugging Tips

### Common Issues

**1. Authentication Issues**
- Check if user session exists: `console.log(supabase.auth.getSession())`
- Verify environment variables in `.env`
- Check Supabase dashboard for auth logs

**2. Data Not Updating**
- Invalidate React Query cache: `queryClient.invalidateQueries({ queryKey: ['key'] })`
- Check network tab for Supabase requests
- Verify Row Level Security (RLS) policies

**3. Styling Issues**
- Check if Tailwind classes are being purged (add to safelist)
- Verify CSS variable values in browser DevTools
- Check for conflicting class names

**4. TypeScript Errors**
- Regenerate Supabase types if schema changed
- Check `tsconfig.json` settings
- Use type assertions sparingly: `as unknown as Type`

### Browser DevTools

**React Query DevTools:**
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to App.tsx in development
{process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
```

**Supabase Logging:**
```typescript
// Enable in client.ts during debugging
const supabase = createClient(url, key, {
  auth: {
    debug: true,  // Enable auth debug logs
  }
});
```

---

## Security Considerations

### 1. Row Level Security (RLS)

Always use RLS policies on Supabase tables:

```sql
-- Example RLS policy
alter table public.medications enable row level security;

create policy "Users can only view their own medications"
  on public.medications for select
  using (auth.uid() = user_id);
```

### 2. Input Validation

Always validate user input with Zod schemas:

```typescript
const safeInput = medicationSchema.parse(userInput);
```

### 3. XSS Prevention

Use `renderSafeMarkdown()` for any user-generated content:

```typescript
import { renderSafeMarkdown } from '@/lib/utils';

<div dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(content) }} />
```

### 4. Authentication Checks

Always verify authentication before showing sensitive data:

```typescript
const { user, loading } = useAuth();

if (loading) return <Loading />;
if (!user) return <Redirect to="/auth" />;
```

### 5. Sensitive Data

Never commit:
- `.env` file
- API keys
- Private keys
- Passwords
- Personal data

---

## Important Gotchas

### 1. TypeScript Strict Mode is OFF

The project uses relaxed TypeScript:
- `any` types are allowed
- Implicit returns are allowed
- Unused variables are allowed

**Be extra careful** with type safety manually.

### 2. View-Based Navigation

The app doesn't use traditional React Router for internal navigation:
- Don't use `<Link>` for internal navigation
- Use `onNavigate('view-name')` instead
- Views persist in localStorage

### 3. Password Validation is Relaxed

From `supabase/config.toml`:
```toml
[auth.password]
min_length = 3
required_characters = []  # Allows "123" as password
```

Consider this for production security.

### 4. Auto-Generated Types

`src/integrations/supabase/types.ts` is **auto-generated**:
- Don't edit manually
- Regenerate after schema changes
- 2,182 lines - very large file

### 5. No Test Coverage

The project has no tests:
- Manual testing required
- No CI/CD validation
- Consider adding tests for critical paths

### 6. Offline Support (PWA)

The app is a PWA with service worker:
- Clear cache when debugging
- Service worker caches Supabase API calls
- Use "Disable cache" in DevTools when developing

---

## Advanced Patterns

### Circuit Breaker Pattern

Used for AI functionality resilience:

```typescript
import { useCircuitBreaker } from '@/hooks/useCircuitBreaker';

const { isOpen, recordSuccess, recordFailure } = useCircuitBreaker('my-function');

if (isOpen) {
  toast.error('Service temporarily unavailable');
  return;
}

try {
  await performAIOperation();
  recordSuccess();
} catch (error) {
  recordFailure();
  throw error;
}
```

### Auto-Tuning Configuration

AI models use auto-tuning stored in database:

```typescript
import { useAutoTuning } from '@/hooks/useAutoTuning';

const { config, updateConfig } = useAutoTuning();

// Config includes model parameters, thresholds, etc.
```

### Offline Sync

Use the offline sync hook for PWA functionality:

```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';

const { syncStatus, pendingChanges, syncNow } = useOfflineSync();
```

### PDF Export

Complex PDF generation with charts and data:

```typescript
import { usePDFExport } from '@/hooks/usePDFExport';

const { generatePDF, isGenerating } = usePDFExport();

const handleExport = async () => {
  await generatePDF({
    userId,
    includeCharts: true,
    dateRange: { start, end },
  });
};
```

---

## Wearable Integration

### Supported Devices

- Google Fit (Android)
- Apple HealthKit (iOS)

### Integration Flow

```typescript
import { useWearables } from '@/hooks/useWearables';

const { connections, connect, disconnect, syncData } = useWearables();

// Connect device
await connect('google-fit');

// Sync data
await syncData('connection-id');

// Disconnect
await disconnect('connection-id');
```

### Edge Functions for Wearables

Located in `supabase/functions/`:
- `google-fit-auth` - OAuth flow
- `google-fit-webhook` - Data webhooks
- `sync-google-fit-data` - Manual sync
- `apple-health-auth` - HealthKit auth
- `analyze-wearable-data` - AI analysis

---

## AI Features

### AI Monitoring Dashboard

View: `"ai-monitoring"`

Features:
- Performance metrics
- Alert history
- Recommendations
- Auto-tuning configuration
- Circuit breaker status

### AI Edge Functions

- `analyze-exam` - Single exam analysis
- `analyze-exams-integrated` - Batch analysis
- `analyze-wearable-data` - Wearable insights
- `suggest-supplements` - AI supplement recommendations
- `send-monthly-ai-report` - Monthly insights

### Using AI Recommendations

```typescript
import { useAIRecommendations } from '@/hooks/useAIRecommendations';

const { recommendations, isLoading } = useAIRecommendations(userId);

// recommendations includes:
// - Health insights
// - Medication adjustments
// - Supplement suggestions
// - Lifestyle recommendations
```

---

## Supabase Edge Functions Reference

### Authentication
- `signup-with-validation` - Server-side validation
- `check-token-expiration` - Token management
- `proactive-token-refresh` - Auto-refresh

### Exam Processing
- `analyze-exam` - AI exam analysis
- `analyze-exams-integrated` - Batch processing
- `process-ocr` - OCR extraction
- `preview-ocr` - OCR preview

### Wearables
- `google-fit-auth` - Google OAuth
- `google-fit-webhook` - Data webhook
- `sync-google-fit` - Data sync
- `apple-health-auth` - Apple OAuth
- `disconnect-wearable` - Disconnect device
- `analyze-wearable-data` - AI insights

### Reports
- `send-monthly-report` - Monthly health report
- `send-monthly-ai-report` - AI insights
- `send-scheduled-reports` - Scheduled delivery
- `send-webhook-notification` - Webhooks
- `test-monthly-report` - Testing

### Chat
- `chat-exams` - Exam chatbot

### Admin
- `admin-reset-password` - Password reset
- `seed-bioimpedance-data` - Demo data
- `cleanup-old-uploads` - Cleanup
- `update-goal-progress` - Goal tracking
- `suggest-supplements` - AI suggestions

---

## Progressive Web App (PWA)

### Configuration

**Manifest:** `public/manifest.json`
```json
{
  "name": "ZoeMed",
  "short_name": "ZoeMed",
  "description": "Seu Assistente de Saúde Pessoal",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0891b2",
  "background_color": "#ffffff"
}
```

**Service Worker:** `public/sw.js`
- Auto-update on new versions
- Offline caching with Workbox
- Network-first strategy for Supabase API

### Installing the PWA

Users can install the app:
- **Desktop:** Browser install prompt
- **Mobile:** "Add to Home Screen"

### Offline Support

The app works offline:
- Cached UI components
- Cached Supabase API responses (24hr expiry)
- Pending changes sync when online

---

## Additional Resources

### Official Documentation

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)

### Project-Specific Docs

- `README.md` - Quick start guide
- `GOOGLE_OAUTH_SETUP.md` - Google Fit OAuth setup
- `package.json` - Dependencies and scripts
- `components.json` - shadcn/ui configuration
- `supabase/config.toml` - Supabase settings

### Learning Resources

For understanding the patterns:
- React Query patterns: https://tkdodo.eu/blog/practical-react-query
- Zod validation: https://zod.dev/?id=basic-usage
- Tailwind best practices: https://tailwindcss.com/docs/reusing-styles
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server (port 8080)
npm run lint             # Run ESLint
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build

# Supabase (if installed locally)
supabase db push                    # Apply migrations
supabase functions deploy <name>    # Deploy edge function
supabase gen types typescript       # Generate types

# Git
git status                          # Check status
git add .                           # Stage changes
git commit -m "message"             # Commit
git push -u origin branch-name      # Push to remote
```

---

## Need Help?

1. **Check this file first** - Most patterns are documented here
2. **Search the codebase** - Look for similar implementations
3. **Console errors** - Check browser DevTools console
4. **Supabase Dashboard** - Check database, auth, and logs
5. **React Query DevTools** - Inspect query cache
6. **Ask for clarification** - When in doubt, ask the user

---

**Last Updated:** 2025-11-28
**Project Version:** 0.0.0 (MVP v1)
**Maintained By:** AI Assistants working with the development team

Remember: This is a **medical application** - prioritize data accuracy, security, and user privacy in all development decisions.
