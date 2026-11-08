-- ForgeLab Studio: execute este arquivo no SQL Editor do seu projeto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null unique,
  password_hash text not null,
  status text not null default 'active' check (status in ('active','suspended')),
  plan_type text not null default 'free' check (plan_type in ('free','monthly','lifetime')),
  access_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_status_idx on public.app_users(status);
create index if not exists app_users_plan_type_idx on public.app_users(plan_type);

-- O portal usa SUPABASE_SERVICE_ROLE_KEY somente no servidor.
-- Não crie políticas públicas para estas tabelas e nunca exponha a service role no navegador.
alter table public.app_settings enable row level security;
alter table public.app_users enable row level security;

insert into public.app_settings(key,value)
values ('main', jsonb_build_object(
  'pricing', jsonb_build_object('enabled',false,'mode','monthly','amount',0,'currency','BRL','title','Acesso ForgeLab Studio','description','Acesso aos módulos Career Intelligence, GitHub Intelligence e Hackmind.','checkoutUrl','','buttonLabel','Quero acessar'),
  'payment', jsonb_build_object('provider','manual','webhookSecretEnc','','webhookEnabled',false,'webhookUrl','/api/webhooks/payment','successEvent','payment.paid'),
  'jwt', jsonb_build_object('issuer','ForgeLab Studio','audience','forgelab-users','expiresMinutes',60,'refreshDays',7),
  'seo', jsonb_build_object('title','ForgeLab Studio | CyberHuntLab','description','Plataforma modular de inteligência e engenharia de software.','keywords','ForgeLab Studio, GitHub Intelligence, AppSec, Hackmind','canonical','','googleAnalyticsId','','googleTagManagerId','','searchConsoleVerification','','headCode','','bodyCode','')
)) on conflict (key) do nothing;
