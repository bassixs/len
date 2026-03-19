# Текущее положение проекта (фронтенд-прототип)

## Дерево проекта

```txt
len/
├── public/
│   └── data/
│       └── products/
│           ├── index.json
│           ├── *.json            (товары по категориям)
│           └── (много данных под карточки)
│   └── images/                (картинки товаров/каталогов)
├── partials/
│   ├── header.html
│   ├── footer.html
│   └── modals.html
├── css/
│   ├── base.css
│   ├── buttons.css
│   ├── header.css
│   ├── pages.css
│   ├── cart-drawer.css
│   ├── product-premium.css
│   ├── responsive.css
│   └── (остальные стили блоков)
├── js/
│   ├── main.js
│   └── modules/
│       ├── product-model.js
│       ├── cart-service.js
│       ├── toast.js
│       ├── ui-shell.js
│       ├── accordion.js
│       ├── navigation.js
│       ├── catalog.js
│       ├── category-products.js
│       ├── product-cards.js
│       ├── product.js
│       ├── cart.js
│       ├── forms.js
│       ├── animations.js
│       ├── sliders.js
│       └── __tests__/
│           ├── product-model.test.js
│           ├── cart-service.test.js
│           └── smoke.test.js
├── *.html (страницы сайта)
│   ├── index.html, catalog.html, category.html, product.html, cart.html …
│   └── delivery.html, contacts.html, blog.html, services.html, thanks.html, 404.html …
├── styles.css
├── vite.config.js
├── package.json
└── package-lock.json
```

## Что за проект

Это **Vite-мультистраничный фронтенд-прототип**: страницы (каталог/категория/карточка/корзина/checkout) рендерятся из данных в `public/data/products/*.json` и используют модульную архитектуру JS.

## Что за что отвечает (основные роли)

- `js/main.js`: при `DOMContentLoaded` запускает нужные `init*` модули только если соответствующие элементы страницы существуют в DOM.
- `js/modules/product-model.js`: чистые утилиты товара без DOM (`normalizeProduct`, `formatPrice`, `resolveImageUrl`, `safeText`).
- `js/modules/cart-service.js`: business-логика корзины без DOM (хранилище, итоги, доставка, подсказка бесплатной доставки).
- `js/modules/cart.js`: UI корзины + мини-корзина (drawer) + checkout-сводка (включая free-delivery hint).
- `js/modules/catalog.js`: главная витрина/каталог-страница (загрузка превью из `index.json`, сортировка превью).
- `js/modules/category-products.js`: страница категории (фильтры/сортировка/цена, состояние в URL, пагинация, рендер сетки).
- `js/modules/product.js`: карточка товара (загрузка товара по `id`, галерея, опции размер/цвет, характеристики, похожие товары, обработка ошибок).
- `js/modules/product-cards.js`: “обогащение” статичных карточек на страницах (подстановка id/ссылок/картинок из JSON).
- `js/modules/ui-shell.js`: “слои” UI (модалки/меню/мини-корзина), Escape и блокировка скролла.
- `js/modules/accordion.js`: общий аккордеон для блоков на странице.
- `js/modules/forms.js`: обработчики форм (контакты, “заказать звонок”, FAQ-аккордеон).
- `js/modules/toast.js`: тосты уведомлений (`success/error/warning`) — отображаются в `toastContainer` (контейнер в `partials/modals.html`).
- `js/modules/sliders.js`: горизонтальный слайдер с drag/cursor-классами (`slider--grab` / `slider--grabbing`).
- `css/*`: стили отдельных блоков и UI states (кнопки, тосты, хинты бесплатной доставки и т.д.).

## Примечание

Если понадобится, могу сделать отдельный документ: “Целевая структура под WordPress + WooCommerce” (папки/плагины/кастомные компоненты) в таком же формате дерева.

