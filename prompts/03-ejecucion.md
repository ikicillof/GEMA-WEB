# Prompt 3 — Ejecución con calidad (superpowers + ecc)

```
Usá superpowers:subagent-driven-development para ejecutar el plan, una tarea
por vez. En cada tarea: TDD (superpowers:test-driven-development) para
la lógica (carrito, cálculo de precio por transferencia, filtros, formato ARS);
al terminar cada tarea corré tsc --noEmit, eslint y next build, y pasá
ecc:react-reviewer y ecc:typescript-reviewer sobre el diff. Usá
superpowers:verification-before-completion antes de marcar nada como hecho.
Mantené un progreso.md con checklist. Hacé commits chicos en español.
```
