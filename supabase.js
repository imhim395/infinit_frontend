import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oszvgzohtrvnmmubefzf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zenZnem9odHJ2bm1tdWJlZnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjIwMzAsImV4cCI6MjA4Nzg5ODAzMH0.67fUPta8RX8elWCVJ05zTUGP8_k7ZJGuz_lWiuL3UUg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
