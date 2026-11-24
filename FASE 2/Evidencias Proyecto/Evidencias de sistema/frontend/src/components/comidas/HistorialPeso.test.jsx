import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import HistorialPeso from './HistorialPeso.jsx';
import { pesoDeLaMeta } from './planComun.js';

// Historial de peso (SC-43): anotar, ver la evolución contra la meta y borrar pesajes.
const HOY = '2026-11-24';
const META = {
  objetivo: 'bajar_peso', aplica: true, pesoInicialKg: 81, pesoObjetivoKg: 77, pesoActualKg: 79.5, ritmoSemanalKg: 0.5,
  fechaInicio: '2026-11-03', faltanKg: 2.5, alcanzada: false, semanas: 5, fechaEstimada: '2026-12-29', avancePct: 38, ajusteKcal: -550,
};
const PESOS = [
  { id: 1, fecha: '2026-11-03', pesoKg: 81 }, { id: 2, fecha: '2026-11-10', pesoKg: 80.5 },
  { id: 3, fecha: '2026-11-17', pesoKg: 80 }, { id: 4, fecha: '2026-11-24', pesoKg: 79.5 },
];
const datos = ({ pesos = PESOS, ritmo = -0.5, meta = META } = {}) => ({
  metaPeso: meta, historialPeso: { pesos, ritmoRealSemanalKg: ritmo, dias: 180, hoy: HOY },
});
function montar(opciones) {
  const acciones = { anotarPeso: vi.fn(async () => true), borrarPeso: vi.fn(async () => true) };
  render(<HistorialPeso datos={datos(opciones)} guardando={false} acciones={acciones} mensaje={null} />);
  return acciones;
}

describe('Tu peso', () => {
  test('CP-266: sin pesajes invita a anotar y no dibuja el gráfico', () => {
    montar({ pesos: [], ritmo: null });
    expect(screen.getByText(/Anota tu peso cada semana para ver aquí cómo avanzas/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ver tus pesajes/)).not.toBeInTheDocument();
  });

  test('CP-266: muestra el ritmo real junto al de la meta, la leyenda y el gráfico con su descripción', () => {
    montar();
    expect(screen.getByText('Bajas 0,5 kg por semana')).toBeInTheDocument();
    expect(screen.getByText(/en las últimas 8 semanas · tu meta: 0,5 kg por semana/)).toBeInTheDocument();
    const grafico = screen.getByRole('img');
    expect(grafico).toHaveAccessibleName(/4 pesajes, el último 79,5 kg; la línea punteada es el ritmo de tu meta/);
    expect(document.querySelector('.grafico-peso__leyenda')).toHaveTextContent('Tu pesoRitmo de tu meta');
    expect(grafico.querySelectorAll('circle')).toHaveLength(4);
  });

  test('sin meta de peso no dibuja la línea de la meta', () => {
    montar({ meta: null });
    expect(screen.queryByText('Ritmo de tu meta')).not.toBeInTheDocument();
    expect(document.querySelector('.grafico-peso__meta')).toBeNull();
  });

  test('CP-267: valida el peso y anota con coma decimal en el día elegido', async () => {
    const usuario = userEvent.setup();
    const acciones = montar();
    const campo = screen.getByLabelText('Peso (kg)');
    await usuario.type(campo, '15');
    await usuario.click(screen.getByRole('button', { name: 'Anotar peso' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un peso entre 20 y 350 kg');
    expect(acciones.anotarPeso).not.toHaveBeenCalled();
    await usuario.clear(campo);
    await usuario.type(campo, '79,26');
    await usuario.click(screen.getByRole('button', { name: 'Anotar peso' }));
    expect(acciones.anotarPeso).toHaveBeenCalledWith({ pesoKg: 79.3, fecha: HOY });
    expect(campo).toHaveValue('');
  });

  test('CP-267: la lista va del más reciente al más antiguo y permite borrar un pesaje', async () => {
    const usuario = userEvent.setup();
    const acciones = montar();
    await usuario.click(screen.getByText('Ver tus pesajes (4)'));
    const filas = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(filas.map((f) => within(f).getAllByRole('cell')[1].textContent)).toEqual(['79,5 kg', '80 kg', '80,5 kg', '81 kg']);
    await usuario.click(screen.getByRole('button', { name: 'Borrar el pesaje del martes, 24 de noviembre' }));
    expect(acciones.borrarPeso).toHaveBeenCalledWith(PESOS[3]);
  });

  test('con el teclado se recorren los pesajes y aparece el detalle con la meta de ese día', async () => {
    const usuario = userEvent.setup();
    montar();
    screen.getByRole('img').focus();
    await usuario.keyboard('{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent(/24 nov.*79,5 kg.*Meta ese día: 79,5 kg/);
    await usuario.keyboard('{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent(/17 nov.*80 kg.*Meta ese día: 80 kg/);
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('pesoDeLaMeta', () => {
  test('baja al ritmo elegido desde el inicio y se queda en el objetivo', () => {
    expect(pesoDeLaMeta(META, '2026-11-03')).toBe(81);
    expect(pesoDeLaMeta(META, '2026-11-17')).toBe(80);
    expect(pesoDeLaMeta(META, '2027-03-01')).toBe(77);
    expect(pesoDeLaMeta(META, '2026-11-01')).toBeNull();
    expect(pesoDeLaMeta({ ...META, objetivo: 'aumentar_masa', pesoInicialKg: 70, pesoObjetivoKg: 72, ritmoSemanalKg: 0.25 }, '2026-11-17')).toBe(70.5);
  });
});
