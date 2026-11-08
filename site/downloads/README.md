# Скачиваемые файлы

Сайт скачивает лаунчер не отсюда, а из **GitHub Releases**:

```
https://github.com/Dosh1rac/my-mc-launcher/releases/latest/download/VOID-Setup.exe
https://github.com/Dosh1rac/my-mc-launcher/releases/latest/download/VOID-Portable.exe
```

Поэтому в релиз файлы загружаются с постоянными именами
`VOID-Setup.exe` и `VOID-Portable.exe` — их готовит `npm run release:assets`.

Эта папка нужна только для локальной проверки сайта без GitHub:
если в `site/config.js` очистить `REPO`, кнопки будут вести на
`VOID-Setup-<версия>.exe` и `VOID-Portable-<версия>.exe` отсюда.

Сами `.exe` в git не попадают: они больше лимита GitHub в 100 МБ на файл.
Полная инструкция — в `RELEASING.md`.
