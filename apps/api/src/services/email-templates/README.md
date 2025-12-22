# Email Templates

This directory contains HTML email templates for the HandoverKey application.

## Templates

- **successor-verification.html** - Email sent to verify a successor's email address
- **user-verification.html** - Email sent to verify a new user's email address
- **password-reset.html** - Email sent when a user requests a password reset
- **account-deletion.html** - Email sent when an account is deleted
- **account-deletion-successor.html** - Email sent to successors when the account holder deletes their account

## Template Variables

Templates use the `{{variableName}}` syntax for dynamic content replacement.

Common variables:

- `{{year}}` - Current year for copyright notice
- `{{verificationLink}}` - Link for email verification
- `{{resetLink}}` - Link for password reset
- `{{userName}}` - User's name
- `{{name}}` - Generic name placeholder

## Usage

Templates are automatically loaded and rendered by the `TemplateEngine` class in `email-service.ts`.

Example:

```typescript
const html = this.templateEngine.render("user-verification", {
  verificationLink: "https://handoverkey.com/verify?token=abc123",
  year: "2025",
});
```
