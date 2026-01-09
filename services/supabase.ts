
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nifommlvvjijmyoihwlo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZm9tbWx2dmppam15b2lod2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MjE0NDksImV4cCI6MjA4MzI5NzQ0OX0.EksXuGCeclooaU8DW11aGuMH6s0sDh7PzA4_w8vv3eE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
