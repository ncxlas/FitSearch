-- Planes enviados por el chat (SC-46): el plan va como adjunto del mensaje y guardado_en marca cuándo la persona lo guardó.
-- AlterTable
ALTER TABLE `mensajes_chat` ADD COLUMN `adjunto` JSON NULL,
    ADD COLUMN `guardado_en` DATETIME(0) NULL;

