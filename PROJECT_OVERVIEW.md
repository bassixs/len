# Проект «Лён» — обзор и актуальный статус

Документ фиксирует состояние фронтенда как headless-витрины на WooCommerce REST API.  
Актуально на **март 2026**.

---

## 1) Цель проекта

Сохранить текущий premium UI/UX фронтенда и полностью перевести данные на Woo:

- фронт: Vite MPA + Handlebars partials;
- backend данных: WooCommerce REST API;
- единая точка вызова на фронте: `/api/wc`.

---

## 2) Что работает сейчас

### 2.1 Страницы

- `catalog.html` — страница разделов (карточки категорий), без тяжелого общего листинга.
- `category.html` — Woo-категории, фильтры, сортировка, цена, сабкатегории, корректный load more.
- `product.html?woo=<id>` — карточка товара из Woo + related.
- `new.html` — раздел новинок из Woo.
- `index.html` — блок "Лучшие предложения" заполняется из Woo.

### 2.2 Наличие товаров

- На карточках: бейдж `Нет в наличии`.
- На странице товара: статус `В наличии` / `Нет в наличии`.
- Для out-of-stock блокируются qty и кнопка покупки.
- В блок "Лучшие предложения" попадают только товары `in stock`.

### 2.3 Product page UX

Реализован апдейт UI/UX:

- галерея с навигацией стрелками и `ArrowLeft/ArrowRight`;
- блок действий (qty/add/wishlist) расположен под фото;
- длинное описание сворачивается/разворачивается;
- длинный текст вынесен в отдельный блок "Подробное описание";
- главная фотография выбирается как наиболее качественная из Woo `images`.

### 2.4 Services page UX

`services.html` обновлена в современном стиле:

- новый hero и CTA;
- карточки форматов пошива;
- обновленный блок процесса;
- более чистая структура и визуальная иерархия.

---

## 3) Производительность и стабильность

- В `woo-client.js` реализованы кэш и dedupe in-flight запросов.
- `fetchWooProduct` оптимизирован:
  - ограничен `_fields`,
  - подключен к общему кэшу (ttl 5 минут).
- На входном `main.js` внедрен page-level lazy loading модулей (code splitting по страницам).
- Для category page применены оптимизации выборки/рендера:
  - append-only load more,
  - staged loading (быстрый первый экран, затем расширение дочерними категориями),
  - устойчивый fallback total/hasMore при отсутствии `X-WP-Total`.
- Для home "Лучшие предложения":
  - фильтр по `stock_status=instock`,
  - догрузка нескольких страниц до набора карточек,
  - удаление статических заглушек при пустом/ошибочном ответе Woo.
- Для product/category добавлены skeleton-состояния (улучшение perceived performance).
- Добавлен prefetch товара перед переходом из листинга (`pointerdown/focusin/touchstart`) без агрессивного hover-spam.
- Добавлен hint cache перехода из category в product (мгновенный первичный рендер карточки до полного ответа API).
- Для hint cache добавлены TTL и лимит хранения в `sessionStorage`.

---

## 4) API-слой (dev/prod)

### Dev

Через `vite.config.js`: `/api/wc -> /wp-json/wc/v3`.

### Production

На проде нужен серверный proxy для `/api/wc` (Vite proxy там отсутствует).  
Текущий вариант рабочий, но целевая архитектура — backend/BFF с безопасным хранением секретов.

---

## 5) Ключевые модули

| Файл                                    | Назначение                                             |
| --------------------------------------- | ------------------------------------------------------ |
| `js/modules/woo-client.js`              | Woo API client, query params, cache/dedupe             |
| `js/modules/woo-map.js`                 | mapping Woo -> frontend model, stock, main image pick  |
| `js/modules/product-model.js`           | нормализация товара, safe image URL                    |
| `js/modules/category-products.js`       | category page: resolve/filter/sort/pagination          |
| `js/modules/product.js`                 | product page rendering, gallery, description behavior  |
| `js/modules/product-cards.js`           | homepage cards from Woo, in-stock logic                |
| `js/modules/new-arrivals.js`            | новинки                                                |
| `js/modules/catalog.js`                 | логика каталога/карточек                               |
| `js/main.js`                            | page-level lazy bootstrap + prefetch hooks             |
| `js/modules/cart.js`, `cart-service.js` | клиентская корзина                                     |
| `css/pages.css`, `css/product-premium.css` | актуальные UI стили страниц и карточки товара      |

---

## 6) Безопасность и репозиторий

- `api-wc-proxy.php` хранится локально и добавлен в `.gitignore`.
- Файл с секретами не коммитится в репозиторий.
- Рекомендуется хранить ключи только на сервере (env/secret storage).

---

## 7) Что остается сделать (приоритет)

1. Финализировать безопасный server-side proxy/BFF для Woo без передачи секретов в URL.
2. Подготовить `DEPLOY_PERF.md`/`DEPLOY.md` с точным порядком выкладки, очисткой кэшей и smoke-check.
3. Спроектировать checkout через Woo Store API (или backend checkout proxy).
4. Добавить автотесты на критичные Woo-сценарии:
   - category totals/pagination,
   - stock visibility/disabled actions,
   - homepage best offers behavior.

---

## 8) Локальный запуск

```bash
npm install
cp .env.example .env.local
# заполнить WOO_ORIGIN, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET, VITE_USE_WOO=true
npm run dev
```

Сборка: `npm run build`  
Проверка: `npm run lint`  
Просмотр билда: `npm run preview`

---

Если меняется бизнес-логика или архитектура, обновлять `PROJECT_OVERVIEW.md` и `CURRENT_POSITION.md` синхронно.
