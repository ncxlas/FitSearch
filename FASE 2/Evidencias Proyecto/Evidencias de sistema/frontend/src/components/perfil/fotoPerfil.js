// Recorta una copia cuadrada; el original del dispositivo no se modifica ni se envía.
export async function prepararFoto(archivo) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) throw new Error('Selecciona una foto JPG, PNG o WebP.');
  if (archivo.size > 5 * 1024 * 1024) throw new Error('La foto original debe pesar como máximo 5 MB.');
  const url = URL.createObjectURL(archivo);
  try {
    const foto = new Image();
    await new Promise((resolver, rechazar) => {
      foto.onload = resolver; foto.onerror = () => rechazar(new Error('No pudimos abrir esa imagen. Prueba con otra foto.')); foto.src = url;
    });
    const lienzo = document.createElement('canvas');
    lienzo.width = 320; lienzo.height = 320;
    const ctx = lienzo.getContext('2d');
    const lado = Math.min(foto.naturalWidth, foto.naturalHeight);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 320, 320);
    ctx.drawImage(foto, (foto.naturalWidth - lado) / 2, (foto.naturalHeight - lado) / 2, lado, lado, 0, 0, 320, 320);
    for (const calidad of [0.85, 0.7, 0.5, 0.3]) {
      const resultado = lienzo.toDataURL('image/jpeg', calidad);
      if (resultado.length < 65000) return resultado;
    }
    throw new Error('No pudimos ajustar el tamaño de la foto. Prueba con una más pequeña.');
  } finally { URL.revokeObjectURL(url); }
}
