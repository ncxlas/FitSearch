-- La atención exclusivamente online no necesita coordenadas ni dirección física.
ALTER TABLE profesionales
  MODIFY ubicacion_lat DECIMAL(10, 7) NULL,
  MODIFY ubicacion_lng DECIMAL(10, 7) NULL;
