-- Planes de comidas (SC-44): planes de un día o de una semana con alimentos del catálogo, gramos y notas.
-- CreateTable
CREATE TABLE `planes_comida` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `nombre` VARCHAR(80) NOT NULL,
    `tipo` VARCHAR(10) NOT NULL,
    `nota` VARCHAR(300) NULL,
    `origen` VARCHAR(20) NOT NULL DEFAULT 'propio',
    `profesional_id` INTEGER NULL,
    `en_uso` BOOLEAN NOT NULL DEFAULT false,
    `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_actualizacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `planes_comida_usuario_id_idx`(`usuario_id`),
    INDEX `planes_comida_profesional_id_idx`(`profesional_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_comida_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `dia` TINYINT NOT NULL,
    `momento` VARCHAR(20) NOT NULL,
    `orden` SMALLINT NOT NULL DEFAULT 0,
    `alimento_id` INTEGER NULL,
    `nombre_alimento` VARCHAR(80) NULL,
    `gramos` DECIMAL(6, 1) NULL,
    `nota` VARCHAR(200) NULL,

    INDEX `plan_comida_items_plan_id_dia_idx`(`plan_id`, `dia`),
    INDEX `plan_comida_items_alimento_id_idx`(`alimento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `planes_comida` ADD CONSTRAINT `planes_comida_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planes_comida` ADD CONSTRAINT `planes_comida_profesional_id_fkey` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_comida_items` ADD CONSTRAINT `plan_comida_items_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `planes_comida`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_comida_items` ADD CONSTRAINT `plan_comida_items_alimento_id_fkey` FOREIGN KEY (`alimento_id`) REFERENCES `alimentos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

