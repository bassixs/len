# Текущее положение проекта (март 2026)

## Коротко

Проект уже не просто прототип: это **рабочий headless-фронтенд на Vite**, который берет данные каталога из **WooCommerce REST API** через путь `'/api/wc'`.

Локальные JSON в `public/data/` оставлены как облегченный fallback и метаданные, но источник правды по товарам — Woo.

## Текущий статус интеграции

- `catalog.html` грузит товары из Woo при `VITE_USE_WOO=true`.
- `product.html?woo=<id>` открывает карточку по Woo ID.
- `category.html` грузит товары категории из Woo, поддерживает фильтры/сортировку/цену/пагинацию.
- Для проблемных категорий на проде добавлено жесткое сопоставление `cat -> woo_cat`:
    - `home-textile -> 24`
    - `women -> 370`
    - `men -> 352`
    - `socks -> 567`
    - `gifts -> 592`
    - `accessories -> 16`
    - `fabrics -> 654`
- Главный блок карточек на `index.html` в Woo-режиме также наполняется через API.

## Архитектура (актуально)

```txt
len/
├── js/
│   ├── main.js
│   └── modules/
│       ├── woo-client.js        (запросы к /api/wc, категории/товары)
│       ├── woo-map.js           (маппинг Woo -> формат фронта)
│       ├── catalog.js           (листинг каталога, Woo/JSON fallback)
│       ├── category-products.js (категории, фильтры, пагинация, Woo mapping)
│       ├── product.js           (карточка, ?woo=ID, related)
│       ├── product-cards.js     (карточки на главной/секции)
│       ├── product-model.js
│       ├── cart-service.js
│       ├── cart.js
│       └── __tests__/
├── public/
│   ├── data/                    (облегченный fallback)
│   └── images/                  (UI ассеты; не медиатека Woo)
├── partials/
├── *.html
├── vite.config.js               (dev proxy /api/wc -> Woo)
├── .env.example
└── PROJECT_OVERVIEW.md
```

## Важные оговорки

- На проде Vite-прокси нет: должен быть серверный прокси `'/api/wc'`.
- В текущем прод-стенде это сделано через `.htaccess` rewrite.
- Ключи Woo, которые попадали в URL/скрины, нужно периодически перевыпускать.
- Корзина пока в основном клиентская (localStorage), без полноценного checkout-потока Woo Store API.

## Что считать «готово»

- Каталог и карточки товаров работают от Woo.
- Категории (включая `women`, `men`, `gifts`) работают от Woo после фикса маппинга.
- Сборка/линт проходят локально.
