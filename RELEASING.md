# Релизы и сайт

Коротко: версия поднимается в `package.json`, тег `vX.Y.Z` уходит на GitHub,
GitHub Actions собирает EXE и сам создаёт релиз. Сайт всегда качает файлы
из последнего релиза, поэтому править HTML при обновлении не нужно.

## Куда что попадает

| Что | Где лежит | В git |
|---|---|---|
| Исходники сайта | `site/` | да |
| Локальные EXE для проверки сайта | `site/downloads/` | нет (больше 100 МБ) |
| Собранный сайт | `site/site-dist/` | нет |
| Сборки electron-builder | `dist/` | нет |
| Файлы релиза с постоянными именами | `release/` | нет |
| Сам релиз | GitHub → Releases | — |
| Опубликованный сайт | GitHub Pages | — |

Постоянные имена файлов в релизе (на них ссылается сайт):

```
VOID-Setup.exe      ← dist/VOID-Setup-<версия>.exe
VOID-Portable.exe   ← dist/VOID-Portable-<версия>.exe
SHA256SUMS.txt
```

Ссылки на сайте:

```
https://github.com/Dosh1rac/my-mc-launcher/releases/latest/download/VOID-Setup.exe
https://github.com/Dosh1rac/my-mc-launcher/releases/latest/download/VOID-Portable.exe
```

Репозиторий указан в одном месте — `site/config.js` (`REPO`).

## GitHub Pages

Pages уже включён: **Settings → Pages → Source = GitHub Actions**.
Сайт живёт по адресу **https://dosh1rac.github.io/my-mc-launcher/**.

Если когда-нибудь Pages отключат или репозиторий переедет:

1. GitHub → репозиторий → **Settings** → **Pages**.
2. **Build and deployment** → **Source** → **GitHub Actions**.
3. Запустить workflow **Deploy site** (вкладка Actions → Run workflow)
   или просто запушить изменение в `site/`.

## Выпуск новой версии

```powershell
# 1. Поднять версию: создаст коммит и тег v1.2.1
npm version patch          # или minor / major

# 2. Отправить коммит и тег
git push --follow-tags
```

Дальше всё делает CI (`.github/workflows/release.yml`):

1. проверяет, что тег совпадает с версией в `package.json`;
2. ставит зависимости и собирает `npm run dist:win`;
3. копирует EXE в `release/` с постоянными именами и считает SHA-256;
4. создаёт GitHub Release с заметками из коммитов.

Прогресс: вкладка **Actions** → **Release**. Через ~10 минут релиз
появится в **Releases** с файлами `VOID-Setup.exe`, `VOID-Portable.exe`
и `SHA256SUMS.txt`.

После релиза сайт сразу отдаёт новые файлы: он запрашивает
`releases/latest`, подставляет версию и адреса ассетов.

## Если CI недоступен: ручной релиз

```powershell
npm run dist:win        # соберёт dist\VOID-Setup-<версия>.exe и portable
npm run release:assets  # разложит их в release\ под постоянными именами

gh release create v1.2.1 `
  release/VOID-Setup.exe `
  release/VOID-Portable.exe `
  release/SHA256SUMS.txt `
  --title "VOID v1.2.1" --generate-notes
```

`gh` — GitHub CLI (`winget install GitHub.cli`, затем `gh auth login`).
Релиз можно создать и руками через веб-интерфейс, прикрепив те же три файла.

## Проверка после релиза

```powershell
# ссылки должны отвечать 302 и вести на объект релиза
curl.exe -sI https://github.com/Dosh1rac/my-mc-launcher/releases/latest/download/VOID-Setup.exe

# показать хеши из релиза
curl.exe -sL https://github.com/Dosh1rac/my-mc-launcher/releases/latest/download/SHA256SUMS.txt

# сверить скачанный файл (PowerShell)
Get-FileHash .\VOID-Setup.exe -Algorithm SHA256
```

На сайте: открыть `#download`, проверить, что кнопки скачивают файл,
а в блоке `VERSION` стоит номер последнего релиза.

## Частые проблемы

- **`Тег не совпадает с версией`** — тег поставили на старый коммит или
  забыли `npm version`. Удалить тег и повторить:
  `git tag -d v1.2.1; git push origin :refs/tags/v1.2.1`.
- **Сайт открылся, но скачивание 404** — релиза ещё нет, либо файлы
  загружены с версией в имени. Сайт ищет `VOID-Setup*.exe` в ассетах,
  но для `latest/download` нужны именно постоянные имена.
- **Pages отдаёт 404** — включён ли Source = **GitHub Actions** и был ли
  деплой после последнего пуша (вкладка Actions → **Deploy site**).
- **Репозиторий приватный** — `releases/latest/download` требует входа.
  Для приватного репозитория сайт и релизы придётся раздавать иначе
  (например, Pages только для описания, а файлы — по прямой ссылке).
- **SmartScreen** — файлы не подписаны сертификатом, это ожидаемо.
