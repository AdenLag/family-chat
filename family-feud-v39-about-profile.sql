alter table public.profiles add column if not exists about text default 'Ready to feud';
update public.profiles set about = 'Ready to feud' where about is null or btrim(about) = '';
