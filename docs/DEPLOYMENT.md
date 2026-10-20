# GitHub Pages

## 1. Создать публичный репозиторий

Создайте `RahimovShaxriyor/codecity`. Загрузите содержимое папки проекта, включая `.github`, `package-lock.json` и `public`.
Не загружайте `node_modules`, `.env`, токены и рабочие логи.

Если используете git:

```sh
git init -b main
git add .
git commit -m "Build CODECITY living developer universe"
git remote add origin https://github.com/RahimovShaxriyor/codecity.git
git push -u origin main
```

## 2. Включить Pages

Settings → Pages → Build and deployment → Source → **GitHub Actions**.
Actions → **Refresh city and deploy Pages** → Run workflow.
Убедитесь, что environment `github-pages` разрешает deployment из main.

Workflow читает публичные репозитории владельца репозитория. Для другого аккаунта задайте repository variable `CODECITY_USER`.
Профильная биография и контакты в `src/main.tsx` и `scripts/preview.ts` персонализированы для Shaxriyor; при форке их тоже нужно изменить.

Встроенный `GITHUB_TOKEN` предоставляется Actions автоматически: добавлять PAT не требуется.
Секрет доступен только шагу `sync`, а не `vite build`. `base: './'` работает в project Pages и на custom domain.

## 3. Обновить профиль

После успешного deployment откройте:

```text
https://rahimovshaxriyor.github.io/codecity/PROFILE.md
```

Вставьте текст в `RahimovShaxriyor/RahimovShaxriyor/README.md`.
Изображение будет загружаться с Pages и обновляться без новых коммитов в профиль.
При переименовании репозитория или custom domain заново возьмите сгенерированный PROFILE.md.
`SITE_URL` автоматически приходит из `configure-pages`, поэтому workflow не привязан к guessed URL.

Локально изменить URL можно переменной `SITE_URL` перед `npm run preview:svg`.
Файл `.env.example` — документация: Node-скрипт сам не загружает `.env`; установите переменные окружения в shell или используйте `node --env-file=.env scripts/sync.ts`.

## Расписание

Обновление каждый день в **03:23 UTC / 08:23 Asia/Tashkent**, а также при push в main и вручную.
Это GitHub Actions schedule внутри репозитория, не отдельная автоматизация Codex.
Расписание запускается только с default branch и может задерживаться. При длительной неактивности GitHub может отключить cron.

## Диагностика

- **Pages 404:** проверьте успешность deploy job и Source: GitHub Actions.
- **API 403/429:** проверьте rate limit и разрешения Actions, повторите позже. Не добавляйте приватный PAT в frontend.
- **Нет окон:** нулевые публичные коммиты — корректные тёмные окна; личные private contributions не учитываются.
- **Release unavailable:** чтение API не удалось; не означает отсутствие релизов.
- **Старое превью:** откройте PNG/SVG URL напрямую и проверьте timestamp; GitHub Camo кеширует изображения.
- **Проблема оплаты аккаунта:** исправление биллинга выполняет владелец; проект не меняет платежные настройки.
- **Нет WebGL:** используйте каталог; Lite уменьшает нагрузку, но не эмулирует WebGL.
- **Rollback:** повторно запустите workflow с предыдущим проверенным коммитом либо сделайте revert; deployment остаётся атомарным.

SVG — основной формат. PNG не требуется для GitHub README: SVG отображается как внешнее изображение.
