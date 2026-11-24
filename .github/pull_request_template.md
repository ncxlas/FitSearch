<!-- Plantilla de PR de FitSearch (SC-41). Completa cada sección y marca las casillas que se cumplen.
     Si un punto no aplica, márcalo y escribe «no aplica» al lado. Borra estos comentarios si quieres. -->

## Qué cambia y por qué
<!-- Una o dos frases. -->

**Historia o solicitud de cambio:** <!-- FS-HU-xx / SC-xx -->
**Tarjeta de Trello:** <!-- link -->

## Cómo se probó
<!-- Pruebas nuevas o modificadas, casos de la Planilla (CP-xxx) y, si hay pantallas, en qué anchos se revisaron. -->

- Backend: <!-- N/N pruebas (npm test) -->
- Frontend: <!-- N/N pruebas (npm test) -->
- MySQL real: <!-- scripts test:mysql que aplican, o «no aplica» -->

## Definition of Done (v1.6)

**Código**
- [ ] DoD-03: el código se integra a `main` con este PR.
- [ ] DoD-04: lo revisa al menos un integrante distinto del autor.
- [ ] DoD-05: `npm run lint` sin errores en backend y frontend, y `npm run build` del frontend sin errores.
- [ ] DoD-06: sin credenciales, claves ni contraseñas en el código; `.env.example` actualizado si hay variables nuevas.

**Pruebas**
- [ ] DoD-07: pruebas unitarias para la lógica nueva o modificada (Jest / Vitest), todas pasan.
- [ ] DoD-08: pruebas de integración para los endpoints nuevos o modificados, todas pasan.
- [ ] DoD-09: casos de prueba registrados y ejecutados en la Planilla; sin defectos críticos ni altos abiertos en el Registro.

**Usabilidad y seguridad**
- [ ] DoD-10: las pantallas nuevas funcionan en celular (360 px) y escritorio (1366 px).
- [ ] DoD-11: los endpoints protegidos validan el token y el rol, y las entradas se validan en el backend.
- [ ] DoD-12: `npm audit` sin vulnerabilidades críticas ni altas nuevas.

**Datos, despliegue y documentación**
- [ ] DoD-13: funciona con `docker compose` (ambiente de prueba desde el Sprint 5).
- [ ] DoD-14: los cambios de base de datos están en migraciones de Prisma (la CI las aplica en una base vacía).
- [ ] DoD-15: README, DAS y Sprint Backlog actualizados si el cambio los afecta.
- [ ] Matriz de control de cambios, Planilla de casos y Trello al día.

<!-- DoD-01 (escenarios demostrados) y DoD-02 (aceptación del PO) se completan en la revisión con el Product Owner. -->

## Pendiente o fuera de este PR
<!-- Lo que queda para otro PR, o «nada». -->
