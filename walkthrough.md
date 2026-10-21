

## Admin Updates
- **Admin Scoping**: Standard admins are now locked to the specific year assigned to them in their profile. Superadmins can assign this year easily from the dashboard.
- **Password Reset**: Superadmins can now reset any user's password directly from the dashboard using the newly integrated Service Role API.


## Security Enhancements
- **File Upload Security (Anti-XSS)**: Added strict frontend validation to FacultyAdminTabs.tsx to block execution files (.html, .svg, .exe, etc.), restrict file types (e.g., images only for course images), and enforce strict file size limits (5MB images, 100MB videos, 50MB files).
- **Backend Bucket Protection**: Generated secure_storage.sql to enforce MIME types and size limits directly at the Supabase database level.


## AI Assistant Upgrades
- **Database-Backed Rate Limiting**: The AI message limit is now strictly enforced at the database level using the \i_usage_log\ table. The counter is fetched and incremented securely via a Service Role client before making any AI API calls, preventing any client-side bypass.
- **Context Filtering**: The AI's System Prompt now dynamically filters the university courses based on the student's exact \aculty_id\ and \year\. This ensures the AI has absolutely no knowledge of other faculties or years, reducing prompt size and enhancing strict scoping.
