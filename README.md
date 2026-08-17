# Фрукты 10+

HTML5-игра про светящиеся цепочки фруктов, меняющиеся целевые суммы, бомбы и разрушаемые препятствия.

## Разработка

Требуются Node.js 22+ и pnpm.

```bash
pnpm install
pnpm dev
```

Vite запустит локальный сервер и будет обновлять игру после изменений.

## Проверки и сборка

```bash
pnpm check
pnpm test
pnpm build
```

Production-сборка создаётся в `dist/`.

Полный релизный pipeline для Яндекс Игр:

```bash
pnpm release:yandex
```

Команда проверяет синтаксис, запускает тесты, собирает production-версию и создаёт `artifacts/fruit-10-plus-yandex.zip`. Внутри архива `index.html` находится в корне, как требует Яндекс Игры.

## Структура

- `src/config/levels.js` — конфигурации уровней;
- `src/core/grid.js` — чистая игровая математика поля;
- `src/platforms/browser.js` — браузерные сохранения и платформенный интерфейс;
- `src/game.js` — игровой процесс и UI;
- `test/` — автоматические тесты;
- `scripts/package-yandex.mjs` — создание ZIP для Яндекс Игр;
- `.github/workflows/ci.yml` — автоматическая проверка каждого изменения.

План развития продукта хранится в [`docs/ROADMAP.md`](docs/ROADMAP.md).
