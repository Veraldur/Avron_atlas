# QA AvronAtlas v34

- JS syntax: node --check модулей советника и нового движка.
- Browser Playwright с локальным `page.set_content`: реальный Chromium; 24 карточки, ещё 24, закрепить, отфильтровать, заменить одну, вставить в статью — без JS page errors.
- Offline engine: 144 карточки за шесть вызовов с проверкой уникальности подписей и 12 направлений.
- AI gateway (Go): HTTP-200 для статики и статуса, POST на мок-Ollama с шестью идеями, запрет чужого Origin (403).
- World JSON: исходный v33, 266 исходных сущностей; схема JSON не менялась.
- Не проверено: реальные запросы OpenAI/Ollama на устройстве пользователя; запуск Windows PE и полноценная Phaser-сцена. Попытка Chromium перехода на localhost завершилась ERR_BLOCKED_BY_ADMINISTRATOR.
