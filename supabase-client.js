// supabase-client.js
const SUPABASE_URL = 'https://inexkigotfyhsprhbqyn.supabase.co'; // استبدل هذا برابط مشروعك
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZXhraWdvdGZ5aHNwcmhicXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNTc4NDcsImV4cCI6MjA3MTYzMzg0N30.nkDBDL-BFHaTJAUdxzXrPqOzpWonDyr2jkKO2S_UwbU'; // استبدل هذا بمفتاح مشروعك

supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
