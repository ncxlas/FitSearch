-- SC-44: «Lo comí» registra las comidas del plan con origen «plan». Restricciones de los planes de comidas y del peso de
-- los pesajes (SC-43). Prisma no representa las CHECK: viven solo en las migraciones, como en las tablas anteriores.
-- MySQL no deja que una CHECK use una columna con acción ON DELETE (alimento_id): la línea se valida con nombre_alimento.
ALTER TABLE `registro_comida` DROP CHECK `registro_comida_origen`;
ALTER TABLE `registro_comida` ADD CONSTRAINT `registro_comida_origen` CHECK (`origen` IN ('manual', 'asistente', 'plan'));
ALTER TABLE `planes_comida` ADD CONSTRAINT `planes_comida_tipo_chk` CHECK (`tipo` IN ('dia', 'semana'));
ALTER TABLE `planes_comida` ADD CONSTRAINT `planes_comida_origen_chk` CHECK (`origen` IN ('propio', 'profesional'));
ALTER TABLE `plan_comida_items` ADD CONSTRAINT `plan_comida_items_dia_chk` CHECK (`dia` BETWEEN 0 AND 7);
ALTER TABLE `plan_comida_items` ADD CONSTRAINT `plan_comida_items_momento_chk` CHECK (`momento` IN ('desayuno', 'media_manana', 'almuerzo', 'merienda', 'cena'));
ALTER TABLE `plan_comida_items` ADD CONSTRAINT `plan_comida_items_linea_chk` CHECK ((`nombre_alimento` IS NOT NULL AND `gramos` > 0) OR `nota` IS NOT NULL);
ALTER TABLE `registros_peso` ADD CONSTRAINT `registros_peso_kg_chk` CHECK (`peso_kg` BETWEEN 20 AND 350);
