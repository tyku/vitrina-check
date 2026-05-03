# Agent Rules

## Validation Libraries

- Do not use `class-validator`.
- Do not use `class-transformer`.
- Use `zod` for validation and schema parsing.

## Imports and Dependencies

- Do not introduce circular dependencies between modules.
- Do not add imports that create circular dependency chains.

## Telegram bot / `TG_TASKS.md`

- Репозиторий ведёт бэклог и процесс работы в **`TG_TASKS.md`**. Перед сменой задачи или в **новом чате** перечитай этот файл: статусы `[ ]` / `[x]`, эпики, зависимости, приложения.
- Подробный рабочий процесс (план без кода → апрув → реализация, коммиты) описан **в начале `TG_TASKS.md`** — следуй ему; пользователь не обязан повторять устный контекст, если он уже зафиксирован там.
