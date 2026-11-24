-- Historial de peso (SC-43): un pesaje por usuario y día. El más reciente actualiza perfiles_usuario.peso_kg.
-- CreateTable
CREATE TABLE `registros_peso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `peso_kg` DECIMAL(5, 2) NOT NULL,
    `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `registros_peso_usuario_id_fecha_key`(`usuario_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `registros_peso` ADD CONSTRAINT `registros_peso_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

