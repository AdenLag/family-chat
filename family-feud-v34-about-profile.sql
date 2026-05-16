
-- Family Feud v34 profile about field
-- Safe to run more than once.
alter table public.profiles
add column if not exists about text default 'Ready to feud';

update public.profiles
set about = 'Ready to feud'
where about is null or trim(about) = '';
