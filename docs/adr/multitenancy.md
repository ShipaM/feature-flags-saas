# ADR-001: Мультитенантность — shared schema

Дата: 2026-09-28 · Статус: принято

## Контекст

SaaS для feature flags. Много организаций (tenant'ов), данные небольшие,
одна команда, одна БД Postgres. Пользователь состоит ровно в одной организации.

## Решение

Shared database + shared schema. Tenant-ключ — organization_id.

- organization_id есть в: organizations, users, projects, audit_logs
- flags и api_keys наследуют tenant через project_id -> projects.organization_id
- organizationId берётся ТОЛЬКО из сессии (users.organization_id), никогда из input
- Все запросы фильтруются через ctx.tenant (withTenantScope):
  byOrg -> projects, audit_logs, users
  byProject -> flags, api_keys
- Чужой объект -> 404 NOT_FOUND (не раскрываем существование)

## Альтернативы

- Schema-per-tenant: миграции x N, сложнее пулы — избыточно для v1
- Database-per-tenant: дорого в эксплуатации

## Последствия

- одна миграция, дёшево, простые отчёты

* изоляция держится на коде: забытый WHERE = утечка
  -> защита: единая точка (tenantProcedure) + интеграционные тесты
* позже: RLS в Postgres как второй слой (defense in depth)
