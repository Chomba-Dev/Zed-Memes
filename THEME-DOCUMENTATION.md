# ZedMemes Theme Documentation

## Theme Overview

Your ZedMemes application uses a sophisticated dual-theme system with both **Light** and **Dark** modes. The theme is structured into three main visual components:

### 1. **Top Navbar (Primary Navigation)**
- **Background**: Dark (#343a40 in light mode, #1a1d20 in dark mode)
- **Purpose**: Contains logo, search bar, notifications, theme switcher, and user account
- **Features**: Transparent input fields with hover effects, icon-based navigation

### 2. **Second Navbar (Secondary Navigation)**
- **Background**: Light (white in light mode, #242628 in dark mode)
- **Purpose**: Contains main navigation links (Home, Trending, Your Likes, Categories, etc.)
- **Features**: Mega menu dropdowns, active state indicators

### 3. **Meme Feed (Content Area)**
- **Background**: Various (white containers with dark meme cards)
- **Purpose**: Displays meme cards in a grid layout
- **Features**: Dribbble-style cards with hover overlays, grayscale images, action buttons

## Color Palette Breakdown

### Light Theme Colors

#### Primary Brand Colors
- **Primary Blue**: `#377dff` (Main brand color)
- **Primary Light**: `#4c84ff` (Hover states)
- **Primary Dark**: `#2968e8` (Active states)

#### Navigation Colors
- **Top Navbar**: `#343a40` (Dark gray)
- **Second Navbar**: `#ffffff` (White)
- **Text on Dark**: `#ffffff` (White)
- **Text on Light**: `#495057` (Dark gray)

#### Content Colors
- **Background**: `#ffffff` (White)
- **Cards**: `#ffffff` (White)
- **Meme Cards**: `#080707` (Very dark)
- **Text Primary**: `#1e2022` (Almost black)
- **Text Secondary**: `#6c757d` (Gray)

#### Interactive Elements
- **Buttons**: `#377dff` (Primary blue)
- **Hover Effects**: `rgba(255, 255, 255, 0.1)` (Semi-transparent white)
- **Borders**: `#e9ecef` (Light gray)

### Dark Theme Colors

#### Primary Brand Colors
- **Primary Blue**: `#377dff` (Same as light theme)
- **Primary Light**: `#4c84ff` (Same as light theme)
- **Primary Dark**: `#2968e8` (Same as light theme)

#### Navigation Colors
- **Top Navbar**: `#1a1d20` (Very dark)
- **Second Navbar**: `#242628` (Dark gray)
- **Text on Dark**: `#ffffff` (White)
- **Text on Light**: `#adb5bd` (Light gray)

#### Content Colors
- **Background**: `#1e2022` (Dark)
- **Cards**: `#242628` (Dark gray)
- **Meme Cards**: `#080707` (Very dark - same as light)
- **Text Primary**: `#ffffff` (White)
- **Text Secondary**: `#adb5bd` (Light gray)

#### Interactive Elements
- **Buttons**: `#377dff` (Primary blue - same as light)
- **Hover Effects**: `rgba(255, 255, 255, 0.1)` (Semi-transparent white)
- **Borders**: `#343a40` (Dark gray)

## Theme Implementation

### CSS Variables Structure
The theme uses CSS custom properties (variables) for easy theme switching:

```css
:root {
  /* Light theme variables */
}

[data-hs-appearance="dark"] {
  /* Dark theme variables */
}
```

### Component Styles

#### 1. Top Navbar (Primary)
```css
.navbar-dark {
  background-color: var(--zedmemes-navbar-primary-bg);
  color: var(--zedmemes-navbar-text);
}
```

#### 2. Second Navbar (Secondary)
```css
.navbar-light {
  background-color: var(--zedmemes-navbar-secondary-bg);
  color: var(--zedmemes-navbar-text-secondary);
}
```

#### 3. Meme Feed Cards
```css
.dribbble-shot {
  background: var(--zedmemes-meme-card-bg);
  /* Hover effects and overlays */
}
```

## Special Features

### 1. **Grayscale Meme Images**
- Images are displayed in grayscale by default
- Color returns on hover for visual impact

### 2. **Hover Overlays**
- Dark overlay appears on meme card hover
- Action buttons (download, share) become visible

### 3. **Theme Switcher**
- Automatic system preference detection
- Manual toggle between light/dark modes
- Persistent theme selection

### 4. **Responsive Design**
- Mobile-optimized navigation
- Flexible grid layout for meme cards
- Collapsible navbar on smaller screens

## Usage Instructions

1. **Include the theme CSS file** in your HTML:
```html
<link rel="stylesheet" href="zedmemes-theme-colors.css">
```

2. **Use theme variables** in your custom CSS:
```css
.my-component {
  background-color: var(--zedmemes-card-bg);
  color: var(--zedmemes-text-primary);
}
```

3. **Apply utility classes** for quick styling:
```html
<div class="text-primary-theme bg-secondary-theme">
  Content with theme colors
</div>
```

## File Structure

- `zedmemes-theme-colors.css` - Complete theme variables and component styles
- `assets/css/theme.min.css` - Bootstrap base theme (light)
- `assets/css/theme-dark.min.css` - Bootstrap dark theme
- `assets/css/custom.css` - Your existing custom styles
- `assets/js/hs.theme-appearance.js` - Theme switching logic

## Customization

To modify colors, update the CSS variables in the `:root` and `[data-hs-appearance="dark"]` selectors. The theme system will automatically apply changes throughout the application.

## Browser Support

The theme system supports all modern browsers with CSS custom properties support:
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 16+
