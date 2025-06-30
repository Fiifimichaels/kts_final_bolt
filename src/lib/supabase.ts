import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in development and provide helpful error messages
if (!supabaseUrl || !supabaseAnonKey) {
  const isDevelopment = import.meta.env.DEV;
  
  if (isDevelopment) {
    console.error('🔧 Supabase Configuration Required');
    console.error('Please set up your Supabase environment variables:');
    console.error('1. Create a .env file in your project root');
    console.error('2. Add your Supabase URL: VITE_SUPABASE_URL=https://your-project.supabase.co');
    console.error('3. Add your Supabase anon key: VITE_SUPABASE_ANON_KEY=your-anon-key');
    console.error('4. Restart your development server');
    console.error('');
    console.error('Current values:');
    console.error('VITE_SUPABASE_URL:', supabaseUrl || 'Missing');
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  }
  
  throw new Error('Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}. Please ensure it's a valid URL (e.g., https://your-project-ref.supabase.co)`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Handle refresh token errors by clearing invalid sessions
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // If token refresh failed, clear any stored session data
    await supabase.auth.signOut();
  }
});

// Add error handling for refresh token issues
const originalGetSession = supabase.auth.getSession;
supabase.auth.getSession = async function() {
  try {
    return await originalGetSession.call(this);
  } catch (error: any) {
    // Check if it's a refresh token error
    if (error?.message?.includes('Invalid Refresh Token') || 
        error?.message?.includes('refresh_token_not_found')) {
      console.warn('Invalid refresh token detected, clearing session...');
      await supabase.auth.signOut();
      return { data: { session: null }, error: null };
    }
    throw error;
  }
};

// Database types based on the schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string | null;
        };
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          company: string | null;
          subject: string | null;
          message: string;
          status: string | null;
          replied: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          company?: string | null;
          subject?: string | null;
          message: string;
          status?: string | null;
          replied?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          company?: string | null;
          subject?: string | null;
          message?: string;
          status?: string | null;
          replied?: boolean | null;
          created_at?: string | null;
        };
      };
    };
  };
}