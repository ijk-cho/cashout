# CashOut - Codebase Architecture & Technical Overview

## Quick Summary

**CashOut** is a production-ready poker game tracking PWA built with:
- **React 19.1.1** + **Vite** for frontend
- **Firebase** (Firestore + Authentication) for backend
- **Tailwind CSS** for styling
- **13 application screens** managing game lifecycle from creation to settlement
- **Real-time synchronization** using Firestore listeners
- **PWA capabilities** with offline support

**Current Status**: Ready for friends system implementation

---

## 1. Technology Stack

```
Frontend:     React 19.1.1, Vite, Tailwind CSS 3.4.1
UI:           Lucide React (icons), Recharts (charts)
Backend:      Firebase Firestore + Authentication
PWA:          Service Worker, Web App Manifest
Dev Tools:    ESLint, PostCSS, Autoprefixer
Deployment:   Netlify / Vercel ready
```

---

## 2. Project Structure

```
/src/
├── App.jsx (2,377 lines)
│   └── Contains all 13 screens and main state management
├── Auth.jsx (165 lines)
│   └── Google OAuth + Email/Password authentication
├── ProfilePage.jsx (300 lines)
│   └── User profile with stats, achievements, charts
├── firebase.js
│   └── Firebase initialization
├── gameService.js (128 lines)
│   └── Firestore CRUD operations
├── sounds.js
│   └── Sound effects manager
├── main.jsx
│   └── React entry point
├── components/
│   └── PremiumUI.jsx
│       └── 20+ reusable UI components
├── UpdateNotification.jsx
├── InstallPrompt.jsx
└── IOSInstallGuide.jsx

/public/
├── sw.js (Service Worker)
├── manifest.json (PWA config)
├── icon-192.png, icon-512.png (PWA icons)
├── offline.html
└── _headers (cache headers)
```

---

## 3. Authentication System

### Supported Methods
1. **Google OAuth** - `signInWithPopup(auth, GoogleAuthProvider)`
2. **Email/Password Registration** - `createUserWithEmailAndPassword(auth, email, password)`
3. **Email/Password Login** - `signInWithEmailAndPassword(auth, email, password)`
4. **Guest Mode** - No authentication, history not saved locally

### User Object Properties
```javascript
{
  uid: string,                           // Unique identifier
  email: string,                         // Email address
  displayName: string,                   // Editable user name
  photoURL: string,                      // From Google profile
  metadata: { creationTime: timestamp }  // Account creation date
}
```

### Authentication State Flow
```
App Mount
  ↓
onAuthStateChanged(auth, setUser)
  ↓
  ├─ undefined (loading) → Show loading or home
  ├─ null (not signed in) → Show Auth screen or guest home
  └─ {user object} → Show authenticated home with profile menu
```

---

## 4. Database Schema (Firestore)

### Collection: `games/{gameId}`

Root-level document structure for each poker game session:

```javascript
{
  // Metadata
  id: string,                          // Auto-generated document ID
  code: string,                        // 6-char unique code (A-Z, 2-9)
  createdAt: timestamp,                // Server timestamp
  updatedAt: timestamp,                // Server timestamp
  
  // Host Info
  hostId: string,                      // Creator's user ID
  hostName: string,                    // Creator's display name
  
  // Game Info
  sessionName: string | null,          // Optional session name
  groupId: string | null,              // Reference to saved group
  status: 'lobby' | 'playing' | 'settle' | 'completed',
  
  // Players Array
  players: [
    {
      id: string,                      // Timestamp-based ID
      name: string,                    // Player name
      venmoUsername: string,           // For payment
      isHost: boolean,                 // True if game creator
      
      // Buy-ins (monetary)
      buyInsCents: [5000, 5000, 2500], // Multiple buy-ins in cents
      totalBuyInCents: 12500,          // Sum of all buy-ins
      finalChipsCents: 18500,          // Final chip count
      netResultCents: 6000,            // Profit/loss in cents
    },
    // ... more players
  ],
  
  // Settlements Array
  settlements: [
    {
      from: string,                    // Debtor name
      to: string,                      // Creditor name
      amountCents: 3000,               // Amount owed in cents
      toVenmo: string,                 // Creditor's Venmo username
      paid: boolean,                   // Payment status
    },
    // ... more settlements
  ]
}
```

### Collection: `activeCodes/{code}`

Lookup table for active game codes:

```javascript
{
  code: string,                        // 6-char code (matches games.code)
  gameId: string,                      // Reference to games collection
  expiresAt: timestamp,                // 24 hours from creation
}
```

### Local Storage

Client-side persistent data:

```javascript
// pokerGameHistory - Array[0..50]
[
  {
    id: string,
    code: string,
    sessionName: string,
    date: ISO timestamp,
    players: [
      { name, buyIn, netResult, ... }
    ],
    myResult: string,                  // Profit/loss for current user
    settlements: [...],
    totalPot: number,
  },
  // ... up to 50 games
]

// pokerGameGroups - Array
[
  {
    id: string,                        // Group ID
    name: string,                      // Group name
    players: [
      { name, venmoUsername }
    ]
  },
  // ... saved groups
]
```

---

## 5. Application Screens (13 Total)

### Game Flow Screens

| Screen | Purpose | Key Features |
|--------|---------|--------------|
| `home` | Main dashboard | Stats display, navigation grid, profile menu |
| `host` | Create new game | Session name input, player name, game setup |
| `join` | Join existing game | Game code input, player name entry |
| `lobby` | Waiting room | Player list, ready status, start game |
| `game` | Live game play | Add buy-ins, chip count display, real-time sync |
| `settle` | Settlement setup | Enter final chip counts per player |
| `settlement` | Payout display | Settlement list, Venmo links, mark as paid |

### User Profile Screens

| Screen | Purpose | Key Features |
|--------|---------|--------------|
| `profile` | User profile | Stats, achievements, monthly chart, avatar |
| `history` | Game history | List of past games with details |
| `stats` | Statistics | Win rate, profits, streaks, averages |
| `analytics` | Advanced analytics | Trends, monthly breakdowns, opponent analysis |
| `leaderboards` | Rankings | Global leaderboard by profit, medals for top 3 |
| `groups` | Group management | Save/load/delete recurring player groups |
| `settings` | User settings | Account, preferences, notifications |

---

## 6. Core Features

### Game Management
- Create games with unique auto-generated 6-character codes
- Real-time synchronization across all players (Firestore listeners)
- Add multiple buy-ins per player with running totals
- Track final chip counts
- Automatic settlement calculation

### Settlement Optimization
- Greedy algorithm minimizes transaction count
- Matches creditors with debtors by amount
- Generates Venmo payment instructions
- Mark settlements as paid/unpaid

### Player Analytics
- Win/loss records
- Profit/loss calculations
- Monthly performance charts (last 6 months)
- Favorite players tracking
- Win rate percentages
- Achievement badges (6 types)

### Leaderboards
- Global rankings by total profit
- Group-specific leaderboards
- Display: rank, name, games, win rate, profit, best win

### Game Groups
- Save recurring player groups locally
- Quick load for new games with same players
- Manage/delete saved groups

### PWA Features
- Installable on home screen
- Offline support via Service Worker
- Network-first for HTML, cache-first for assets
- iOS-specific installation guide
- Auto-update detection

---

## 7. API & Database Operations (gameService.js)

### Core Functions

```javascript
// Code Generation
generateGameCode()                    // Random 6-char code
generateUniqueCode()                  // Unique code with collision detection

// Game Operations
createGame(gameData)                  // Create game + save code (24h expiry)
getGameByCode(code)                   // Retrieve game from code lookup
updateGame(gameId, updates)           // Update with server timestamp
subscribeToGame(gameId, callback)     // Real-time listener (onSnapshot)

// Player Management
removePlayer(gameId, playerId, players) // Remove from game
updatePaymentStatus(gameId, idx, paid)  // Mark settlement paid

// Cleanup
deleteExpiredCode(code)               // Remove expired code
```

### Design Patterns

**Real-time Synchronization**:
- Uses Firestore `onSnapshot()` for live updates
- All clients see changes instantly
- Unsubscribe handlers prevent memory leaks

**Server Timestamps**:
- All operations use `serverTimestamp()` for consistency
- Prevents clock skew issues

**Code Uniqueness**:
- Generate 6-char code from 32-char set (A-Z except I/O, 2-9)
- Query `activeCodes` collection to check uniqueness
- Retry loop until unique code found

---

## 8. Frontend Components (PremiumUI.jsx)

### Button Components
- `PrimaryButton` - Gold gradient (#D4AF37), full width, icon support
- `SecondaryButton` - Transparent with gold border
- `GhostButton` - Minimal style, no background
- `DangerButton` - Red for destructive actions

### Card Components
- `PremiumCard` - Gradient background with border
- `GlassCard` - Glass morphism effect
- `BaseCard` - Standard solid card

### Specialized Components
- `PlayerCard` - Show player with buy-in, chips, profit/loss
- `StatCard` - Stat display with optional trend
- `StatusBadge` - Status indicator (success/warning/danger/info)
- `CountBadge` - Numeric badge in gold
- `PremiumInput` - Styled input with label & error support
- `CodeInput` - 6-char monospace code input
- `GameHeader` - Game code & session name header
- `PotDisplay` - Display total pot amount
- `LoadingSpinner` - Loading animation

### Design System

**Color Palette**:
- Primary Gold: `#D4AF37` (light), `#C9A942` (dark)
- Dark Background: `#0A0E14`
- Card: `#1E2433` → `#252B3D` (gradient)
- Text: `#F8FAFC` (primary), `#CBD5E1` (secondary)
- Success: `#10B981`, Danger: `#EF4444`, Warning: `#F59E0B`

**Styling Approach**:
- Tailwind CSS with custom color palette
- Consistent border styling with white/10 opacity
- Shadow effects for depth
- Hover/active states with scale transforms
- Glass morphism with backdrop-blur

---

## 9. State Management

All state centralized in `App.jsx` using `useState` hooks:

### Game State
- `gameId`, `gameCode`, `inputCode` - Current game reference
- `players`, `currentPlayer` - Player data
- `settlements` - Settlement list
- `screen` - Current navigation screen

### User State
- `user` - Firebase user object
- `authChecked` - Authentication state loaded
- `gameHistory` - Array of completed games

### UI State
- `showProfileMenu`, `showInstallButton`, `deferredPrompt` - UI visibility
- `copied` - Clipboard feedback
- `unsubscribe` - Real-time listener cleanup

### Settings State
- `userSettings` - User preferences
- `settingsTab` - Active settings tab
- Various edit mode flags

---

## 10. Key Technical Details

### Settlement Algorithm
```
1. Separate players by result (creditors vs. debtors)
2. Sort by amount descending
3. Greedily match creditors with debtors
4. Generate settlement list with from/to/amount
Result: Minimized transaction count
```

### Code Generation
- **Character set**: 32 chars (A-Z except I/O, 2-9)
- **Combinations**: 6 chars = 1,073,741,824 possibilities
- **Collision detection**: Query activeCodes collection
- **Expiry**: 24 hours from creation

### Monetary Precision
- **Storage**: All amounts in cents (integers)
- **Why**: Prevents JavaScript floating-point issues
- **Display**: Convert to dollars with `(cents / 100).toFixed(2)`

### Real-time Sync
- **Listener**: `onSnapshot(doc(db, 'games', gameId), callback)`
- **Trigger**: Any field change updates all connected clients
- **Cleanup**: Unsubscribe function called in useEffect cleanup

---

## 11. Existing Social Features

### Implemented
- Leaderboards (global + group-specific)
- Player tracking through game history
- "Favorite Players" in profile based on frequency
- Player statistics and comparisons

### Not Implemented
- Friend lists/connections
- Friend requests/management
- Direct messaging
- Friend game invitations
- Friend stats comparison
- Social notifications
- Online status

---

## 12. PWA Configuration

### Service Worker Strategy
- **HTML files**: Network-first (always fetch latest)
- **JS/CSS bundles**: Cache-first (immutable hashes)
- **Images**: Cache-first (1-week expiry)
- **API calls**: Network-first with fallback

### Manifest
```json
{
  "name": "CashOut",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#D4AF37",
  "background_color": "#0A0E14"
}
```

### Install Prompts
- Automatic install prompt for Android
- iOS installation guide with screenshots
- Update notification for new versions

---

## 13. Build & Deployment

### Development
```bash
npm run dev       # Vite dev server with HMR
npm run lint      # ESLint check
```

### Production
```bash
npm run build     # Optimized dist/ folder
npm run preview   # Test production build locally

# Deploy to:
netlify deploy --prod    # Netlify
vercel --prod            # Vercel
firebase deploy          # Firebase Hosting
```

---

## 14. Integration Points for Friends System

### Recommended New Collections
1. `users/{uid}` - User profiles with metadata
2. `friendships/{uid}/friends/{friendUid}` - Active relationships
3. `friend_requests/{uid}/pending/{fromUid}` - Pending requests
4. `notifications/{uid}/items` - System notifications

### New Screens to Add
- `friends` - Friends list & management
- `friend_profile` - View friend stats
- `friend_requests` - Manage incoming requests

### Enhance Existing
- Profile menu: Add "Friends" option
- Home: "Invite Friend" button for new games
- Settlement: Highlight friends owed money

### Integration Strategy
- Follow same `onSnapshot` pattern for real-time updates
- Reuse `PremiumUI` components
- Add friends to localStorage cache
- Use screen-based navigation like existing app

---

## 15. File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `App.jsx` | 2,377 | Main app, all screens, state management |
| `gameService.js` | 128 | Firestore operations |
| `ProfilePage.jsx` | 300 | User profile & stats |
| `Auth.jsx` | 165 | Authentication UI |
| `PremiumUI.jsx` | ~400 | Reusable components |
| `firebase.js` | 22 | Firebase initialization |
| `sounds.js` | 35 | Sound effects |

---

## Summary

CashOut is a **well-architected, production-ready PWA** with:

✅ **Strong Foundation**:
- Firebase real-time sync
- Robust authentication
- Comprehensive UI component library
- PWA/offline capabilities

✅ **Clean Code Patterns**:
- State-based routing
- Reusable components
- Service-based database operations
- Unidirectional data flow

⚠️ **Ready for Enhancement**:
- Basic social features (leaderboards only)
- Perfect opportunity to add friends system
- Infrastructure supports real-time friend updates
- UI components ready to extend

The codebase provides excellent scaffolding for implementing a comprehensive friends system using the same patterns and technologies already in place.
