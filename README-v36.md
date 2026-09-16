# EFGC Youth App v36 — Admin Password Recovery

- Adds a Forgot password action to the Admin sign-in screen.
- Uses Supabase Auth `/recover` to send the supported password-recovery email.
- Detects the `type=recovery` callback and restores the recovery session.
- Lets the Admin choose a new password through the authenticated Supabase `/user` endpoint.
- Signs out after reset so the new password must be used on the next Admin sign-in.
- Does not expose, read, or directly overwrite the stored password hash.

Note: Supabase's built-in email sender remains rate-limited. A dedicated SMTP provider is still required for reliable production Youth/Leader/recovery email delivery.
