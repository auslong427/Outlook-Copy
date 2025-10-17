# Changelog

## [Unreleased] - 2025-10-17

### Fixed
- Fixed improper function call check for `chip.focus()` - now uses proper type checking
- Fixed potential XSS vulnerabilities with email sanitization
- Fixed memory leaks by clearing all timers on page unload
- Fixed double-click issues by disabling button during operation
- Fixed CSS hover/active states to respect disabled state
- Fixed toast append errors with proper try-catch
- Fixed clipboard fallback with proper error handling and logging

### Added
- Added `sanitizeEmail()` function for input validation and normalization
- Added explicit `tabindex="0"` for better keyboard navigation
- Added disabled state styling for buttons
- Added high contrast mode support in CSS
- Added visual indicators (✓/✗) for success/failure messages
- Added `clipboardWrite` permission to manifest
- Added `host_permissions` to manifest for better security transparency
- Added `author` and `homepage_url` to manifest
- Added comprehensive `.gitignore` file
- Added `FIXES.md` documentation
- Added `readonly` and `aria-hidden` attributes to textarea fallback
- Added better dark mode support for toast notifications
- Added box-shadow to toast for better visibility
- Added text wrapping prevention to button
- Added comprehensive error logging for debugging

### Enhanced
- Enhanced error handling in click handler with preventDefault
- Enhanced toast function with input validation
- Enhanced security with email regex validation before copying
- Enhanced cleanup on page unload
- Enhanced accessibility throughout the extension
- Enhanced logging for better debugging

### Security
- ✅ Passed CodeQL security scan with 0 vulnerabilities
- Input sanitization prevents injection attacks
- Proper email validation with regex
- Safe clipboard operations with fallback

### Removed
- Removed empty "read me" file

## [1.7.0] - Previous Release
- Initial release with core functionality
