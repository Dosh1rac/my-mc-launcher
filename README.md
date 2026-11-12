# VOID — лаунчер Minecraft

**Сайт:** https://dosh1rac.github.io/my-mc-launcher/ · **Скачать:** [Releases](https://github.com/Dosh1rac/my-mc-launcher/releases) · **Версия:** 1.5.0

Лаунчер Minecraft с графическим интерфейсом на Electron: версии и загрузчики, каталог Modrinth, профили, импорт сборок и автоустановка Java. Внутри — общее ядро запуска, которое используют и GUI, и консольный режим.

## Возможности

**Версии и загрузчики**

- Ваниль, **Fabric**, **Forge**, **NeoForge** — списки версий берутся из официальных API (Mojang, Fabric Meta, Forge maven, NeoForge maven).
- Скачивание клиента, библиотек и ассетов по манифесту Mojang с проверкой SHA-1, прогрессом и отменой.
- Снапшоты включаются отдельным переключателем.

**Контент из Modrinth**

- Моды, шейдеры, ресурспаки и датапаки: поиск, категории, пагинация, иконки.
- Фильтрация по версии игры и загрузчику; для шейдеров — Iris/OptiFine, для датапаков — только существующий мир.
- Файлы качаются с `cdn.modrinth.com` с проверкой SHA-512.
- Установленное помечается в каталоге по журналу `.void-content.json` в папке игры.

**Сборки и профили**

- Импорт `.mrpack` (Modrinth): файлы, overrides, отдельная папка в `userData/instances`.
- Импорт `.zip`: безопасная распаковка в отдельную папку; версию и загрузчик для такого профиля выбираешь сам.
- Профили с собственной папкой игры, версией и загрузчиком; переключение во вкладке «Играть».

**Java**

- Ручной выбор `java.exe`, сброс к системной Java.
- **Автоустановка Eclipse Temurin** (JRE 8, 17, 21, 25) в `userData/runtimes`: скачивание с Adoptium, проверка SHA-256, проверка запуском. Системная Java не меняется.

**Интерфейс**

- Три темы — тёмная, светлая, розовая — сохраняются между запусками.
- Пиксельный космический фон: галактика, чёрная дыра, пульсары, метеоры. Анимация замирает в скрытом окне.
- Настройки памяти (с ограничением по ОЗУ), папки игры, темы и Java.

## Требования

- **Windows 10/11 x64** — под неё собраны EXE и работает автоустановка Java.
- **Node.js 20+** (проверено на 24) — если запускаешь из исходников.
- **Java 17+** для современных версий Minecraft; можно поставить прямо из настроек VOID.
- ~1 ГБ свободного места на игру без модов.
- Аккаунт Microsoft с Minecraft: Java Edition — для онлайна. Офлайн-режим работает без него.

## Быстрый старт

```bash
git clone https://github.com/Dosh1rac/my-mc-launcher.git
cd my-mc-launcher
npm ci
npm run gui
```

Дальше: выбери версию во вкладке «Версии», нажми скачать, при необходимости поставь загрузчик — и запускай во вкладке «Играть». Если Java не найдена, открой «Настройки» → «Автоустановка Java».

## Скачать

- **Portable:** https://github.com/Dosh1rac/my-mc-launcher/releases/latest/download/VOID-Portable.exe
- **Установщик:** https://github.com/Dosh1rac/my-mc-launcher/releases/latest/download/VOID-Setup.exe

Portable не требует установки: положил и запустил. Установщик создаёт ярлык и позволяет выбрать папку. Файлы не подписаны сертификатом, поэтому Windows может показать SmartScreen — это ожидаемо, подробнее в разделе «Ограничения».

## Команды

| Команда | Что делает |
|---|---|
| `npm run gui` | Лаунчер в режиме разработки (Electron + HMR) |
| `npm run gui:build` | Сборка main/preload/renderer в `out/` |
| `npm run gui:start` | Запуск собранной версии без dev-сервера |
| `npm run dist:win` | Установщик и portable EXE в `dist/` |
| `npm run site:serve` | Сайт локально: http://localhost:4174 |
| `npm run site:build` | Сборка сайта в `site/site-dist/` |
| `npm run release:assets` | EXE с постоянными именами и SHA-256 для релиза |
| `npm start` | CLI: вход и запуск игры |
| `npm run start:offline` | CLI: запуск с офлайн-профилем |
| `npm run login` | Только вход Microsoft, без запуска |
| `npm run dry` | Собрать аргументы в `last-launch-args.json` без запуска Java |
| `npm run analyze` | Разбор `version.json`: библиотеки, правила, ассеты |

## Как это работает

**Скачивание версии.** Манифест Mojang даёт список файлов версии. Лаунчер скачивает клиент, библиотеки и ассеты, проверяя SHA-1, и не перекачивает уже проверенное.

**Загрузчик.** Fabric ставится из profile-JSON Fabric Meta. Forge и NeoForge — официальным installer-JAR: `java -jar installer.jar --installClient`, с той Java, что выбрана в настройках. После установки в `versions/` появляется новый профиль, и лаунчер запускает его как обычную версию.

**Контент.** Проект ищется через Modrinth API, затем берётся версия, совместимая с выбранной игрой и загрузчиком. Скачивается основной файл, проверяется SHA-512 и кладётся в `mods/`, `shaderpacks/`, `resourcepacks/` или `saves/<мир>/datapacks/`.

**Импорт сборки.** `.mrpack` — это zip с `modrinth.index.json`: лаунчер скачивает перечисленные файлы, раскладывает overrides в отдельную папку и создаёт профиль. `.zip` просто безопасно распаковывается: проверяются пути, запрещены symlink и выход за пределы папки.

**Запуск.** Ядро собирает classpath и аргументы по правилам `version.json`, подставляет ник, UUID, токен, папку игры и память, затем запускает Java и передаёт лог в интерфейс.

## Где хранятся данные

| Путь | Что там |
|---|---|
| `%APPDATA%\my-mc-launcher\settings.json` | тема, версия, память, папка игры, Java, загрузчик |
| `%APPDATA%\my-mc-launcher\profiles.json` | профили сборок |
| `%APPDATA%\my-mc-launcher\runtimes\` | Java, установленная из лаунчера |
| `%APPDATA%\.void-minecraft\` | папка игры по умолчанию в собранной версии |
| `<папка игры>\.void-content.json` | журнал установленного контента |
| `%APPDATA%\my-mc-launcher\session.json` | токены Microsoft (GUI), в git не попадает |
| `auth/session.json` | токены Microsoft в CLI-режиме, в git не попадает |
| `last-launch-args.json` | аргументы из `npm run dry`, содержит токен |

В режиме разработки папка игры по умолчанию — `.minecraft/` рядом с проектом.

## Структура проекта

```
my-mc-launcher/
├── index.ts                 # CLI-точка входа
├── core.ts                  # общее ядро запуска
├── auth.ts, login.ts        # Microsoft device code → Xbox → Minecraft
├── config.ts                # чтение .env
├── analyze.ts               # учебный разбор version.json
├── electron/
│   ├── main.ts              # IPC, окно, запуск, импорт, Java
│   ├── settings.ts          # settings.json и валидация
│   ├── downloader.ts        # манифест Mojang, SHA-1, прогресс
│   ├── loaders.ts           # Fabric, Forge, NeoForge
│   ├── content.ts           # Modrinth: поиск и установка
│   ├── pack-import.ts       # импорт .mrpack и .zip
│   ├── java.ts              # автоустановка Temurin
│   ├── preload.ts           # мост contextBridge
│   └── renderer/            # HTML, CSS, TS, космический фон
├── site/                    # лендинг для GitHub Pages
├── scripts/                 # подготовка файлов релиза
├── .github/workflows/       # release.yml, pages.yml
├── electron-builder.yml     # NSIS + portable
└── RELEASING.md             # как выпускать версии
```

## Безопасность

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — интерфейс не имеет прямого доступа к файлам и процессам, только через узкий IPC.
- Скачивание контента разрешено только с `cdn.modrinth.com`, с проверкой SHA-512 и ограничением размера.
- Архивы распаковываются с проверкой путей, запретом `..`, абсолютных путей и symlink.
- `session.json` (в `%APPDATA%\my-mc-launcher\` и в `auth/` для CLI) содержит `refresh_token` — фактически ключ от аккаунта. Не коммить и не пересылай.
- Не коммить `.env`, `auth/`, `last-launch-args.json`, `accounts.json`, `tokens.json`.

## Ограничения

- **Онлайн-вход** работает: client ID VOID добавлен в allowlist Minecraft Services. Вход идёт через код устройства, пароль вводится только на сайте Microsoft.
- **Версия Java подбирается вручную.** Лаунчер не определяет автоматически, какая Java нужна конкретной версии Minecraft.
- **Зависимости модов не ставятся автоматически.** При установке показывается число обязательных зависимостей — их нужно добавить отдельно.
- **Датапаки** ставятся только в уже существующий мир.
- **`.zip`-сборки** не содержат манифеста: версию и загрузчик для такого профиля выбираешь сам.
- **EXE без цифровой подписи** — SmartScreen покажет предупреждение. Нужно нажать «Подробнее» → «Выполнить в любом случае».
- Собранные EXE и автоустановка Java рассчитаны на Windows x64.

## Решение проблем

**`spawn java ENOENT` или «Java не найдена»** — открой «Настройки», укажи путь к `java.exe` или нажми «Установить» в блоке автоустановки.

**«Для модов выберите загрузчик»** — моды не ставятся на ваниль: выбери Fabric, Forge или NeoForge и скачай версию с ним.

**`Modrinth: HTTP 429`** — слишком много запросов. Подожди минуту и повтори.

**Игра крашится при старте** — смотри лог в лаунчере и `<папка игры>/logs/latest.log`. Чаще всего это память или неподходящая Java.

**`403 Invalid app registration`** — это allowlist Mojang, а не настройка Azure. См. «Ограничения».

**`AADSTS700016` / `AADSTS7000218`** — неверный `MS_CLIENT_ID` или в Azure не включён **Allow public client flows**.

**`No handler registered for 'loaders:list'`** — приложение работает со старым main-процессом. Полностью закрой VOID и запусти заново.

**Сборка падает с `EPERM` / `EBUSY`** — папку `dist/win-unpacked` держит запущенный VOID или антивирус. Закрой приложение и повтори, либо собери в другую папку:

```powershell
npx electron-builder --win nsis portable --x64 --publish never --config.directories.output=dist-retry
```

**Скачивание оборвалось** — запусти ещё раз: проверенные файлы не качаются повторно.

## Сайт и релизы

- Сайт: `site/`, публикуется на GitHub Pages через `.github/workflows/pages.yml`.
- Релиз: тег `vX.Y.Z` → `.github/workflows/release.yml` собирает EXE и создаёт GitHub Release с `VOID-Setup.exe`, `VOID-Portable.exe` и `SHA256SUMS.txt`.
- Сайт берёт файлы с `releases/latest/download/...`, поэтому версию в HTML править не нужно.
- Подробности: [RELEASING.md](RELEASING.md).

## Лицензия

ISC (см. `package.json`).
