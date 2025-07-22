# MUI Guidelines

This document outlines the guidelines and best practices for using Material-UI (MUI) in this project.

## General Principles

- Use MUI components instead of custom HTML elements where possible
- Follow MUI's design system and component patterns
- Maintain consistent theming across the application
- Leverage MUI's styling solutions (styled API or sx prop)

## Component Usage

### Basic Components

- Prefer MUI components over HTML elements (e.g., use `Button` instead of `button`)
- Use appropriate variants and colors based on the component's purpose
- Follow MUI's component composition patterns

```jsx
// Good
<Button variant="contained" color="primary">Submit</Button>

// Avoid
<button className="submit-button">Submit</button>
```

### Layout Components

- Use MUI's Grid system for responsive layouts
- Utilize Box and Container components for spacing and containment
- Apply consistent spacing using the theme spacing system

```jsx
<Container maxWidth="lg">
  <Grid container spacing={2}>
    <Grid item xs={12} md={6}>
      <Box sx={{ p: 2 }}>Content</Box>
    </Grid>
  </Grid>
</Container>
```

## Theming

### Theme Configuration

- Define custom theme properties in a centralized theme file
- Use theme palette colors instead of hard-coded values
- Extend the default theme when necessary

```jsx
const theme = createTheme({
  palette: {
    primary: {
      main: '#61dafb',
    },
    secondary: {
      main: '#282c34',
    },
  },
});
```

### Styling Best Practices

- Use the `sx` prop for one-off styling needs
- Create styled components for reusable styles
- Use theme values for consistent spacing, colors, and typography

```jsx
// Using sx prop
<Box sx={{ 
  p: 2,
  bgcolor: 'primary.main',
  borderRadius: 1
}}>

// Using styled API
const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}));
```

## Accessibility

- Include proper ARIA labels and roles
- Ensure proper color contrast ratios
- Support keyboard navigation
- Test with screen readers

## Performance

- Use dynamic imports for larger components when needed
- Avoid unnecessary re-renders with proper component composition
- Follow MUI's performance recommendations for production builds

## Common Patterns

### Forms

- Use MUI form components consistently
- Implement proper form validation
- Follow consistent error handling patterns

```jsx
<TextField
  error={!!error}
  helperText={error}
  label="Username"
  variant="outlined"
/>
```

### Data Display

- Use appropriate data display components (Tables, Lists, Cards)
- Implement consistent loading states
- Handle empty states gracefully

### Navigation

- Use MUI navigation components consistently
- Implement proper mobile responsiveness
- Follow consistent navigation patterns

## Testing

- Test component rendering and interactions
- Verify theme application
- Test responsive behavior
- Include accessibility tests

```jsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';

test('renders button with correct styles', () => {
  render(
    <ThemeProvider theme={theme}>
      <Button variant="contained">Test</Button>
    </ThemeProvider>
  );
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```
