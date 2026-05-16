-- Family Feud v33 polish support
-- Run this once in Supabase SQL Editor before testing the new About field.

alter table public.profiles
add column if not exists about text default 'Ready to feud';

update public.profiles
set about = 'Ready to feud'
where about is null or trim(about) = '';
