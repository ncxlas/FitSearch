-- Cuenta eliminada por su dueño (SC-42): la fila de usuarios se conserva anonimizada (sin nombre, correo, contraseña
-- ni cuenta de Google) para que las citas y reseñas pasadas sigan existiendo sin datos personales.
ALTER TABLE `usuarios` ADD COLUMN `eliminado_en` DATETIME(0) NULL;
