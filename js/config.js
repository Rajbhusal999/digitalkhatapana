/**
 * config.js - Supabase Configuration settings
 * Replace these placeholder values with your actual Supabase Project API credentials.
 * You can find these in your Supabase Dashboard under:
 * Project Settings -> API -> Project API Keys
 */

const SUPABASE_URL = "https://gxmmjkyakfwkhqtyizdk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bW1qa3lha2Z3a2hxdHlpemRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NzA2MDEsImV4cCI6MjA5NjA0NjYwMX0.V7A_rM1eEUntupVI7F0Hvk29jd2ugSpUnfHy21gfpkg";

/**
 * EmailJS Configuration (Used for sending real auto-reply emails to parents)
 * 1. Create a free account at https://www.emailjs.com/
 * 2. Add an Email Service (e.g., Gmail)
 * 3. Create an Email Template using variables: {{to_email}}, {{to_name}}, {{school_name}}
 * 4. Paste your keys here:
 */
const EMAILJS_PUBLIC_KEY = "ek5-6CQ_K5BnjROxc";
const EMAILJS_SERVICE_ID = "service_fgchy0c";
const EMAILJS_TEMPLATE_ID = "template_gv6r8ue";
