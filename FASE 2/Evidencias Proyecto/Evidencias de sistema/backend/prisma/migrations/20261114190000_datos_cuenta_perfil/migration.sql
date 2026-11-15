CREATE TABLE `datos_cuenta` (
  `usuario_id` INTEGER NOT NULL,
  `telefono` VARCHAR(20) NULL,
  `biografia` VARCHAR(500) NULL,
  `instagram` VARCHAR(200) NULL,
  `linkedin` VARCHAR(200) NULL,
  `sitio_web` VARCHAR(250) NULL,
  `foto` MEDIUMTEXT NULL,
  PRIMARY KEY (`usuario_id`),
  CONSTRAINT `datos_cuenta_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
