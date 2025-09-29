# CLAUDE Components - Politik Cred' UI Component System

This document provides comprehensive documentation of the UI component system used in Politik Cred', including design patterns, usage examples, and architectural decisions.

## Table of Contents
1. [Component Architecture Overview](#component-architecture-overview)
2. [Base UI Components](#base-ui-components)
3. [Feature Components](#feature-components)
4. [Specialized Components](#specialized-components)
5. [Component Patterns](#component-patterns)
6. [Styling System](#styling-system)
7. [Accessibility Guidelines](#accessibility-guidelines)

---

## Component Architecture Overview

### Design System Foundation
The component system is built on a foundation of accessibility, consistency, and French political platform requirements.

**Core Principles:**
- **Accessibility First**: All components meet WCAG 2.1 AA standards
- **Composition over Inheritance**: Flexible component composition
- **Type Safety**: Full TypeScript integration
- **Political Neutrality**: Design supports all political viewpoints equally
- **French UX Patterns**: Familiar interaction patterns for French users

**Technology Stack:**
- **Radix UI**: Accessible component primitives
- **Tailwind CSS 4**: Utility-first styling system
- **Class Variance Authority**: Type-safe component variants
- **Lucide React**: Consistent icon system
- **React Forwardref**: Proper ref forwarding for all components

---

## Base UI Components

### Alert System
Status communication with clear visual hierarchy.

**Component Structure:**
```typescript
// Base alert with compound pattern
<Alert variant="destructive">
  <AlertCircle className="w-5 h-5" />
  <AlertTitle>System Status</AlertTitle>
  <AlertDescription>News system deployment in progress</AlertDescription>
</Alert>
```

**Variants:**
- `default`: General information (gray)
- `destructive`: Errors and warnings (red)

**Usage Examples:**
```typescript
// Error state in news banner
<Alert variant="destructive">
  <AlertCircle className="w-5 h-5 text-[#DC2626]" />
  <AlertTitle>Connection Error</AlertTitle>
  <AlertDescription>Unable to load political news</AlertDescription>
</Alert>

// Success state in voting
<Alert>
  <CheckCircle className="w-5 h-5 text-[#059669]" />
  <AlertTitle>Vote Submitted</AlertTitle>
  <AlertDescription>Your vote will be reviewed by moderators</AlertDescription>
</Alert>
```

**Accessibility Features:**
- `role="alert"` for screen readers
- Proper color contrast ratios
- Clear visual and text hierarchy

---

### Button System
Comprehensive button system with political platform variants.

**Component Structure:**
```typescript
// Type-safe variants with CVA (actual implementation)
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

**Political Platform Usage:**
```typescript
// Primary action - French blue
<Button variant="default" className="bg-[#1E3A8A]">
  Soumettre le vote
</Button>

// Destructive action - French red
<Button variant="destructive" className="bg-[#DC2626]">
  Signaler le contenu
</Button>

// Secondary action
<Button variant="outline">
  Voir les détails
</Button>

// Vote category selection
<Button
  variant={selectedCategory === 'integrity' ? "default" : "outline"}
  size="sm"
  onClick={() => setCategory('integrity')}
>
  Intégrité
</Button>
```

**Accessibility Features:**
- Focus visible indicators
- ARIA invalid states
- Keyboard navigation support
- Proper semantic elements

---

### Card System
Flexible card components for content organization.

**Component Structure:**
```typescript
// Compound card components
<Card className="border-l-4 border-[#1E3A8A]">
  <CardHeader>
    <CardTitle>Score de crédibilité</CardTitle>
    <CardDescription>Évaluation communautaire</CardDescription>
  </CardHeader>
  <CardContent>
    <Progress value={credibilityScore} />
  </CardContent>
  <CardFooter>
    <Button variant="outline">Voir détails</Button>
  </CardFooter>
</Card>
```

**Political Platform Variants:**
```typescript
// Politician profile cards
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex items-center space-x-3">
      <Avatar>
        <AvatarImage src={politician.image_url} />
        <AvatarFallback>{politician.initials}</AvatarFallback>
      </Avatar>
      <CardTitle>{politician.name}</CardTitle>
    </div>
  </CardHeader>
  <CardContent>
    <Progress value={(politician.credibility_score / 200) * 100} />
  </CardContent>
</Card>

// Vote submission status
<Card className="border-green-200 bg-green-50">
  <CardContent className="p-4">
    <div className="flex items-center space-x-2 text-green-800">
      <CheckCircle className="w-5 h-5" />
      <span className="font-medium">Vote soumis avec succès</span>
    </div>
  </CardContent>
</Card>
```

**Layout Features:**
- Responsive grid support
- Hover states for interactivity
- Color-coded borders for status
- Flexible content areas

---

### Switch Component
Toggle controls for user preferences.

**Component Structure:**
```typescript
// Radix UI switch with custom styling
<Switch
  checked={isEnabled}
  onCheckedChange={setIsEnabled}
  className="data-[state=checked]:bg-[#1E3A8A]"
/>
```

**Political Platform Usage:**
```typescript
// Notification preferences
<div className="flex items-center space-x-2">
  <Switch
    id="political-alerts"
    checked={preferences.politicalAlerts}
    onCheckedChange={(checked) =>
      setPreferences(prev => ({ ...prev, politicalAlerts: checked }))
    }
  />
  <Label htmlFor="political-alerts">
    Alertes actualités politiques
  </Label>
</div>

// Privacy settings
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label htmlFor="public-profile">Profil public</Label>
    <Switch
      id="public-profile"
      checked={user.isPublic}
      onCheckedChange={handlePublicToggle}
    />
  </div>
</div>
```

**Accessibility Features:**
- Proper ARIA states
- Keyboard toggle support
- Visual focus indicators
- Screen reader announcements

---

## Feature Components

### News Banner
Real-time scrolling political news ticker.

**Component Architecture:**
```typescript
export function NewsBanner() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [error, setError] = useState(false)
  const offsetRef = useRef(0)
  const isPausedRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)

  // Speed-based smooth scrolling
  const scrollSpeed = 50 // pixels per second

  useEffect(() => {
    const step = (timestamp: number) => {
      if (!isPausedRef.current) {
        const distance = (scrollSpeed * delta) / 1000
        offsetRef.current -= distance

        // Seamless infinite loop
        if (-offsetRef.current >= contentWidth) {
          offsetRef.current += contentWidth
        }

        trackRef.current.style.transform = `translateX(${offsetRef.current}px)`
      }
      animationFrameRef.current = requestAnimationFrame(step)
    }

    animationFrameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [contentWidth])

  return (
    <div className="bg-[#1E3A8A] text-white border-b-4 border-[#DC2626]">
      {/* Breaking News Label */}
      <div className="absolute left-0 top-0 bottom-0 bg-[#DC2626] flex items-center px-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-bold">ACTU</span>
        </div>
      </div>

      {/* Scrolling Content */}
      <div
        className="pl-20 py-3"
        onMouseEnter={() => { isPausedRef.current = true }}
        onMouseLeave={() => { isPausedRef.current = false }}
      >
        <div ref={trackRef} className="flex">
          {news.map((item) => (
            <NewsItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Features:**
- **Smooth 60fps scrolling** using requestAnimationFrame
- **Pause on hover** for better readability
- **Infinite loop** with seamless transitions
- **Error states** with fallback messaging
- **French political color scheme**

---

### Vote Dialog
Comprehensive evidence-based voting interface.

**Component Architecture:**
```typescript
export function VoteDialog({ politicianId, onClose }: VoteDialogProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<VoteFormData>({
    vote_type: 'positive',
    points: 5,
    category: 'integrity',
    evidence_title: '',
    evidence_description: '',
    evidence_url: '',
    evidence_type: 'article',
    source_credibility: 7,
    tags: []
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setShowAuthDialog(true)
      return
    }

    // Submit vote with evidence validation
    const { error } = await supabase
      .from('votes')
      .insert([{
        ...formData,
        politician_id: politicianId,
        user_id: user.id
      }])

    if (!error) {
      setSubmitStatus('success')
      // Auto-close after success
      setTimeout(onClose, 2000)
    }
  }

  return (
    <Dialog open={!!politicianId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Soumettre un vote avec preuves</span>
            <Badge variant="outline">Modération requise</Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vote Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <VoteTypeCard
              type="positive"
              selected={formData.vote_type === 'positive'}
              onClick={() => setFormData(prev => ({ ...prev, vote_type: 'positive' }))}
            />
            <VoteTypeCard
              type="negative"
              selected={formData.vote_type === 'negative'}
              onClick={() => setFormData(prev => ({ ...prev, vote_type: 'negative' }))}
            />
          </div>

          {/* Evidence Requirements */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="evidence_title">Titre de la preuve *</Label>
              <input
                id="evidence_title"
                type="text"
                required
                value={formData.evidence_title}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  evidence_title: e.target.value
                }))}
              />
            </div>

            <div>
              <Label htmlFor="evidence_description">Description de la preuve *</Label>
              <textarea
                id="evidence_description"
                required
                rows={4}
                value={formData.evidence_description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  evidence_description: e.target.value
                }))}
              />
            </div>
          </div>

          {/* Legal Disclaimer */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Engagement de responsabilité</p>
                  <p>
                    En soumettant ce vote, vous certifiez que les informations
                    sont exactes selon la législation française.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Key Features:**
- **Evidence Requirements**: All votes must include evidence
- **Legal Compliance**: French law disclaimer and responsibility
- **Moderation Queue**: All votes require human approval
- **Progressive Enhancement**: Works without JavaScript
- **Authentication Integration**: Seamless auth flow

---

### Politician List
Grid display of political figures with credibility scores.

**Component Architecture:**
```typescript
export function PoliticianList({ onVoteClick }: PoliticianListProps) {
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPoliticians() {
      const { data, error } = await supabase
        .from('politicians')
        .select('*')
        .order('credibility_score', { ascending: false })

      if (!error) {
        setPoliticians(data || [])
      }
      setLoading(false)
    }
    fetchPoliticians()
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 150) return 'text-green-600'
    if (score >= 100) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {politicians.map((politician) => (
        <Card key={politician.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={politician.image_url} />
                  <AvatarFallback>
                    {politician.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{politician.name}</CardTitle>
                  <p className="text-sm text-gray-600">{politician.party}</p>
                </div>
              </div>
              <Badge className={getScoreBadgeColor(politician.credibility_score)}>
                {politician.credibility_score}/200
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Progress
              value={(politician.credibility_score / 200) * 100}
              className="h-2"
            />

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {politician.total_votes} votes
              </span>
              <Button
                onClick={() => onVoteClick(politician.id)}
                size="sm"
                variant="outline"
              >
                Voter
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Features:**
- **Score-based Sorting**: Politicians ordered by credibility
- **Color-coded Scoring**: Visual feedback for score ranges
- **Responsive Grid**: Adapts to screen sizes
- **Loading States**: Skeleton loading for better UX
- **Empty States**: Helpful messaging when no data

---

## Specialized Components

### Authentication Integration
Seamless authentication flow integrated into voting process.

```typescript
// Auth-aware voting button
<Button
  onClick={() => {
    if (!user) {
      setShowAuthDialog(true)
      return
    }
    onVoteClick(politician.id)
  }}
>
  {user ? 'Voter' : 'Se connecter pour voter'}
</Button>

// Auth dialog with context
<AuthDialog
  open={showAuthDialog}
  onClose={() => setShowAuthDialog(false)}
  defaultMode="signup"
  onSuccess={() => {
    setShowAuthDialog(false)
    onVoteClick(politician.id)
  }}
/>
```

### Progress Indicators
Visual feedback for credibility scores and system status.

```typescript
// Credibility score visualization
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Score de crédibilité</span>
    <span className={getScoreColor(score)}>{score}/200</span>
  </div>
  <Progress
    value={(score / 200) * 100}
    className="h-2"
  />
</div>

// Loading states with skeleton UI
{loading && (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {[...Array(6)].map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          </div>
        </CardHeader>
      </Card>
    ))}
  </div>
)}
```

---

## Component Patterns

### 1. **Compound Component Pattern**
Components are composed of smaller, reusable parts.

```typescript
// Alert composition
<Alert>
  <AlertIcon />
  <AlertTitle />
  <AlertDescription />
</Alert>

// Card composition
<Card>
  <CardHeader>
    <CardTitle />
    <CardDescription />
  </CardHeader>
  <CardContent />
  <CardFooter />
</Card>
```

### 2. **Render Props Pattern**
Flexible rendering with callback functions.

```typescript
// Vote status with render prop
<VoteStatus politicianId={id}>
  {({ status, score, canVote }) => (
    <div>
      <Progress value={score} />
      {canVote && <Button>Voter</Button>}
    </div>
  )}
</VoteStatus>
```

### 3. **State Management Pattern**
Consistent state handling across components.

```typescript
// Form state management
const [formData, setFormData] = useState<VoteFormData>(initialState)

const updateField = (field: keyof VoteFormData, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}

// Error state management
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
```

### 4. **Event Handling Pattern**
Consistent event propagation and handling.

```typescript
// Button click with loading state
const handleClick = async () => {
  setLoading(true)
  try {
    await action()
    onSuccess?.()
  } catch (error) {
    setError(error.message)
    onError?.(error)
  } finally {
    setLoading(false)
  }
}
```

---

## Styling System

### Color Palette
French political platform color scheme.

```typescript
const colors = {
  // French political colors
  primary: "#1E3A8A",      // French blue - primary actions
  secondary: "#DC2626",     // French red - alerts, emphasis
  accent: "#059669",        // Success green
  warning: "#D97706",       // Warning orange

  // Neutral colors
  background: "#FAFAFA",    // Light background
  foreground: "#111827",    // Text color
  muted: "#6B7280",         // Secondary text

  // Semantic colors
  destructive: "#DC2626",   // Error states
  success: "#059669",       // Success states
  info: "#1E3A8A"          // Information states
}
```

### Typography Scale
Consistent text sizing and hierarchy.

```css
.text-xs    { font-size: 0.75rem; }   /* 12px */
.text-sm    { font-size: 0.875rem; }  /* 14px */
.text-base  { font-size: 1rem; }      /* 16px */
.text-lg    { font-size: 1.125rem; }  /* 18px */
.text-xl    { font-size: 1.25rem; }   /* 20px */
.text-2xl   { font-size: 1.5rem; }    /* 24px */
.text-3xl   { font-size: 1.875rem; }  /* 30px */
.text-4xl   { font-size: 2.25rem; }   /* 36px */
```

### Spacing System
Consistent spacing using Tailwind's 4px base unit.

```css
.space-1    { margin: 0.25rem; }   /* 4px */
.space-2    { margin: 0.5rem; }    /* 8px */
.space-3    { margin: 0.75rem; }   /* 12px */
.space-4    { margin: 1rem; }      /* 16px */
.space-6    { margin: 1.5rem; }    /* 24px */
.space-8    { margin: 2rem; }      /* 32px */
```

---

## Accessibility Guidelines

### WCAG 2.1 AA Compliance
All components meet accessibility standards.

**Color Contrast:**
- Text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Clear focus indicators

**Keyboard Navigation:**
- Tab order follows logical sequence
- All interactive elements are keyboard accessible
- Escape key closes modals and dialogs

**Screen Reader Support:**
- Semantic HTML elements
- ARIA labels and descriptions
- Live regions for dynamic content

**Focus Management:**
```typescript
// Dialog focus management
useEffect(() => {
  if (isOpen) {
    dialogRef.current?.focus()
  }
}, [isOpen])

// Keyboard event handling
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    onClose()
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onClick()
  }
}
```

### Responsive Design
Mobile-first approach with progressive enhancement.

```css
/* Mobile base styles */
.news-banner {
  @apply py-3 px-4;
}

/* Tablet (768px+) */
@screen md {
  .news-banner {
    @apply py-4 px-6;
  }
}

/* Desktop (1024px+) */
@screen lg {
  .news-banner {
    @apply py-6 px-8;
  }
}
```

### Touch Targets
Minimum 44px touch targets for mobile accessibility.

```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Button touch targets */
.btn-sm {
  @apply h-8 px-3; /* 32px height + padding */
}

.btn-default {
  @apply h-9 px-4; /* 36px height + padding */
}

.btn-lg {
  @apply h-10 px-6; /* 40px height + padding */
}
```

This component system ensures that Politik Cred' provides a consistent, accessible, and professional user experience that builds trust with French citizens while maintaining the highest standards of political neutrality and legal compliance.