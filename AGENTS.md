# Agent Rules

## Validation Libraries

- Do not use `class-validator`.
- Do not use `class-transformer`.
- Use `zod` for validation and schema parsing.

## Imports and Dependencies

- Do not introduce circular dependencies between modules.
- Do not add imports that create circular dependency chains.

## Telegram bot / `TG_TASKS.md`

- Репозиторий ведёт бэклог и процесс в **`TG_TASKS.md`**. Перед сменой задачи, после **любого триггера на выполнение работы** или в **новом чате** перечитай `TG_TASKS.md` и `AGENTS.md` (этот раздел): статусы `[ ]` / `[x]`, эпики, зависимости, приложения.
- **Любой триггер** («сделай задачу», «продолжим», «исправь», следующий шаг и т.д.) = **полный проход цепочки** из начала `TG_TASKS.md`, без пропусков.
- Цепочка **строго по порядку**: **план** (без кода) → **апрув** пользователя → **код** → **ревью агентом** → **коммит**. Коммит не выполнять до ревью; кода не писать до апрува плана. Детали и формулировки шагов — в начале `TG_TASKS.md`.
