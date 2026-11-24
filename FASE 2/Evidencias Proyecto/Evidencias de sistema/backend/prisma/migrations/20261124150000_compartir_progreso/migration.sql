-- Progreso compartido con un profesional (SC-45): permisos por categoría y registro de accesos.
-- CreateTable
CREATE TABLE `permisos_compartir` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `profesional_id` INTEGER NOT NULL,
    `perfil` BOOLEAN NOT NULL DEFAULT false,
    `salud` BOOLEAN NOT NULL DEFAULT false,
    `comidas` BOOLEAN NOT NULL DEFAULT false,
    `peso` BOOLEAN NOT NULL DEFAULT false,
    `planes` BOOLEAN NOT NULL DEFAULT false,
    `fecha_otorgado` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_actualizacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `permisos_compartir_profesional_id_idx`(`profesional_id`),
    UNIQUE INDEX `permisos_compartir_usuario_id_profesional_id_key`(`usuario_id`, `profesional_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accesos_compartidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `profesional_id` INTEGER NOT NULL,
    `accion` VARCHAR(20) NOT NULL,
    `categorias` VARCHAR(100) NULL,
    `fecha` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `accesos_compartidos_usuario_id_fecha_idx`(`usuario_id`, `fecha`),
    INDEX `accesos_compartidos_profesional_id_usuario_id_fecha_idx`(`profesional_id`, `usuario_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `permisos_compartir` ADD CONSTRAINT `permisos_compartir_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permisos_compartir` ADD CONSTRAINT `permisos_compartir_profesional_id_fkey` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accesos_compartidos` ADD CONSTRAINT `accesos_compartidos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accesos_compartidos` ADD CONSTRAINT `accesos_compartidos_profesional_id_fkey` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Acciones del registro de accesos.
ALTER TABLE `accesos_compartidos` ADD CONSTRAINT `accesos_compartidos_accion_chk` CHECK (`accion` IN ('otorgo', 'cambio', 'revoco', 'consulto'));
