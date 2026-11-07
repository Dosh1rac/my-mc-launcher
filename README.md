# my-mc-launcher

Учебный консольный лаунчер Minecraft на Node.js + TypeScript. Скачивает файлы игры, авторизует через Microsoft, собирает команду запуска Java и запускает ванильный клиент.

Проект сделан как пошаговое пособие: от «что вообще происходит при запуске» до собственного GUI и модов.

## Что уже умеет

- Скачивает и проверяет по SHA-1 версию, библиотеки и ассеты (проверено на 1.20.1).
- **Авторизует через Microsoft** (device code flow + Xbox Live + XSTS + Minecraft Services), пускает на онлайн-серверы.
- Обновляет токены по `refresh_token` и хранит сессию между запусками.
- Запускает ванильный клиент; есть офлайн-режим для одиночной игры.
- **Есть графический интерфейс на Electron**: выбор памяти, офлайн-ник, кнопка «Играть», прогресс-бар, лог и показ кода входа Microsoft.
- Показывает прогресс скачивания и логи игры в консоли (CLI-режим).
- Умеет собирать аргументы запуска **без запуска игры** (`--dry-run`).
- Разбирает `version.json` и объясняет, из чего состоит classpath.

## Требования

- **Node.js 20+** (проект проверен на 24.20.0).
- **Java 17+** для Minecraft 1.20.1. Проверено на Java 21 (Temurin).
- Аккаунт Microsoft с купленным **Minecraft: Java Edition** — для онлайн-режима.
- Собственное приложение в Azure (бесплатно, 5 минут) — см. ниже.
- ~800 МБ свободного места: клиент, библиотеки и ассеты.

## Установка

```bash
git clone <url-репозитория>
cd my-mc-launcher
npm ci
```

Если репозитория ещё нет — просто скопируйте папку и выполните `npm install`.

## Настройка авторизации Microsoft

Лаунчер использует **device code flow**: браузер открывается отдельно, пароль вводится только на сайте Microsoft. Лаунчер пароль не видит и не хранит.

1. Откройте [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Имя — любое, например `my-mc-launcher`.
3. Supported account types — **Personal Microsoft accounts only**.
4. Redirect URI оставьте пустым.
5. Нажмите **Register** и скопируйте **Application (client) ID**.
6. Перейдите в **Authentication** → **Advanced settings** → **Allow public client flows** → **Yes** → **Save**.
7. Создайте `.env` из шаблона и вставьте свой client ID:

```bash
copy .env.example .env
```

```env
MS_CLIENT_ID=ваш-application-client-id
```

Теперь можно войти:

```bash
npm run login
```

Скрипт напечатает ссылку и код. Откройте ссылку, введите код, подтвердите вход — сессия сохранится в `auth/session.json` (в git не попадает).

## Команды

| Команда | Что делает |
|---|---|
| `npm run gui` | Открывает графический лаунчер (Electron, режим разработки) |
| `npm run gui:build` | Собирает main/preload/renderer в папку `out/` |
| `npm run gui:start` | Запускает собранную версию без dev-сервера |
| `npm start` | CLI: вход через Microsoft (если нужно) и запуск Minecraft |
| `npm run login` | Только вход и проверка профиля, без запуска игры |
| `npm start:offline` | CLI: запуск с офлайн-профилем |
| `npm run dry` | Собирает аргументы, сохраняет в `last-launch-args.json` и выходит **без запуска Java** |
| `npm run analyze` | Печатает разбор `version.json`: библиотеки, правила, ассеты, шаблоны аргументов |

## Структура проекта

```
my-mc-launcher/
├── index.ts               # CLI-точка входа
├── core.ts                # общая логика запуска (используют CLI и GUI)
├── auth.ts                # Microsoft device code → Xbox → Minecraft
├── login.ts               # отдельный вход без запуска игры
├── config.ts              # чтение .env
├── analyze.ts             # учебный разбор version.json
├── electron/
│   ├── main.ts            # главный процесс Electron + IPC
│   ├── preload.ts         # безопасный мост contextBridge
│   └── renderer/          # интерфейс: HTML, CSS, TypeScript
├── electron.vite.config.ts
├── .env.example           # шаблон для MS_CLIENT_ID
├── package.json
├── tsconfig.json
├── .gitignore
│
├── auth/session.json      # токены сессии, в git не попадает
├── .minecraft/            # генерируется при запуске, в git не попадает
│   ├── assets/            # звуки, языки, текстуры (~620 МБ)
│   ├── libraries/         # jar-библиотеки (~58 МБ)
│   ├── versions/1.20.1/   # 1.20.1.json + клиентский jar
│   └── logs/
│
├── out/                   # сборка Electron, в git не попадает
└── last-launch-args.json  # генерируется npm run dry, в git не попадает
```

## Как это работает

```
1. version.json  ──►  что скачать: библиотеки, ассеты, нативы
2. downloads     ──►  проверка SHA-1, докачка недостающего
3. rules         ──►  фильтр библиотек под Windows/Linux/macOS
4. classpath     ──►  "lib1.jar;lib2.jar;...;1.20.1.jar"
5. аргументы     ──►  подстановка ${auth_player_name}, ${game_directory} и т.д.
6. spawn("java", [...])  ──►  окно Minecraft
```

Ключевая идея: лаунчер не «запускает exe», а генерирует длинную команду `java` по правилам из JSON. Посмотреть её целиком можно в `last-launch-args.json` после `npm run dry`.

## Цепочка авторизации

```
Microsoft account
   │ device code + scope "XboxLive.signin offline_access"
   ▼
Microsoft access_token (+ refresh_token)
   │ user.auth.xboxlive.com
   ▼
Xbox Live token (XBL) + uhs
   │ xsts.auth.xboxlive.com, RelyingParty = api.minecraftservices.com
   ▼
XSTS token + xuid
   │ api.minecraftservices.com/authentication/login_with_xbox
   ▼
Minecraft access_token (живёт ~24 часа)
   │ api.minecraftservices.com/minecraft/profile
   ▼
uuid + ник → аргументы --username / --uuid / --accessToken
```

Токен Minecraft переиспользуется, пока ему больше 5 минут до истечения. Иначе Microsoft-токен обновляется по `refresh_token`, и цепочка проходится заново.

## Как устроен GUI

Electron разделён на три процесса:

| Часть | Файл | Что делает |
|---|---|---|
| **main** | `electron/main.ts` | Node.js: скачивание, авторизация, запуск Java, IPC |
| **preload** | `electron/preload.ts` | Узкий мост `contextBridge`, отдаёт renderer только нужные методы |
| **renderer** | `electron/renderer/` | HTML/CSS/TS, без доступа к Node и файловой системе |

Вся логика запуска лежит в `core.ts`, поэтому CLI (`index.ts`) и GUI используют один и тот же код. Обмен идёт через IPC:

```
renderer  ──launcher:start──►  main  ──►  core.launch()
renderer  ◄──launcher:log/progress/device-code/close──  main
```

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — renderer не может напрямую читать файлы или запускать процессы.

## Ограничения текущей версии

- **Онлайн-вход требует одобрения Mojang.** С 2025 года Minecraft Services принимает только client ID из allowlist. Свой Azure-клиент надо отправить на проверку через форму из [этой статьи](https://help.minecraft.net/hc/en-us/articles/16254801392141). До одобрения работает офлайн-режим.
- **Только ваниль.** Forge и Fabric пока не поддерживаются.
- **Только версия 1.20.1** (задаётся в `index.ts`).
- Аккаунты Game Pass / демо могут не иметь профиля Java Edition.

## План развития

- [x] **A. Аргументы запуска** — classpath, natives, подстановки.
- [x] **C. Авторизация Microsoft** — device code, Xbox Live, XSTS, refresh-токены.
- [x] **D. GUI** — Electron-окно: память, аккаунт, кнопка «Играть», прогресс-бар, лог.
- [ ] **Моды** — Forge / Fabric: установка installer-а и модифицированный `version.json`.
- [ ] Выбор версии и список аккаунтов в GUI.

## Решение проблем

**`spawn java ENOENT`** — Java не найдена в PATH. Укажите путь явно в `index.ts`:

```ts
javaPath: "C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\javaw.exe",
```

**Игра крашится при старте** — смотрите последние строки `[game] ...` в консоли или `.minecraft/logs/latest.log`. Чаще всего это память (`-Xmx`) или несовместимая версия Java.

**`AADSTS700016` / `AADSTS700038`** — неверный `MS_CLIENT_ID`. Скопируйте Application (client) ID ещё раз.

**`AADSTS7000218` или «public client»** — в Azure не включён **Allow public client flows**.

**XSTS `2148916233`** — у аккаунта нет профиля Xbox. Зайдите на [xbox.com](https://www.xbox.com) и создайте его.

**404 при получении профиля** — на аккаунте нет Minecraft: Java Edition.

**`403 Invalid app registration`** — это не ошибка кода и не настройка Azure. Minecraft Services пускает только client ID из своего allowlist. Отправьте свой client ID на проверку через форму, ссылка на которую есть в [статье Minecraft Help](https://help.minecraft.net/hc/en-us/articles/16254801392141). После одобрения (приходит письмо от Mojang Enforcement) тот же код заработает без изменений. До этого используйте `npm start:offline`.

**`ts-node` падает с `Cannot read properties of undefined (reading 'fileExists')`** — установился TypeScript 7, который несовместим с `ts-node` 10. Проект использует `tsx`, запускайте через npm-скрипты.

**Скачивание оборвалось** — просто запустите снова. Уже скачанные файлы проверяются по хешу и не качаются повторно.

## Безопасность

- `auth/session.json` содержит `refresh_token` — фактически ключ от аккаунта. Не коммитьте его и не пересылайте.
- `last-launch-args.json` содержит `accessToken`. После реального входа это настоящий токен.
- Не коммитьте `.env`, `auth/`, `tokens.json`.
- Пароль Microsoft лаунчер не видит: он вводится только на сайте Microsoft.

## Лицензия

ISC (см. `package.json`).
