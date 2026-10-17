---
"notionic": minor
---

**Breaking:** notionic now requires React 19. The peer dependency changes from `^18.0.0 || ^19.0.0` to `^19.0.0`. React 18 was never tested, and the package only targets React Server Components frameworks, which run React 19. If you're on React 18, stay on notionic 0.2.
