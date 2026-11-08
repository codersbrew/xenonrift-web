// Public values (also baked into every game build). The anon key only allows what the database's row-level security
// and Supabase Auth permit; never put a service_role / sb_secret key here.
export const SUPABASE_URL = 'https://lrafvfnidgdvxhrphzau.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyYWZ2Zm5pZGdkdnhocnBoemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NTQwODQsImV4cCI6MjEwOTIzMDA4NH0.3aYL7XTK3SUIjltQEV_y213ltudJstc60kBn3NoqHy0';
export const RESET_URL = 'https://xenonrift.com/auth/reset/';
// Signing an Apple TV in (link/): Google / Apple come back here. On the Supabase project's redirect allow-list.
export const LINK_URL = 'https://xenonrift.com/link/';
