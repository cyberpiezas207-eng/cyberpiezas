import { exportOfflineData, importOfflineData } from './offlineSync';

export async function downloadOfflineDatabase() {
  try {
    const jsonData = await exportOfflineData();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boutique-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, message: 'Datos descargados exitosamente' };
  } catch (error) {
    console.error('Error descargando datos:', error);
    return { success: false, message: 'Error al descargar datos' };
  }
}

export async function uploadOfflineDatabase(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    await importOfflineData(text);
    return { success: true, message: 'Datos importados exitosamente' };
  } catch (error) {
    console.error('Error importando datos:', error);
    return { success: false, message: 'Error al importar datos' };
  }
}

export async function exportToCSV(data: any[], filename: string) {
  try {
    if (data.length === 0) {
      return { success: false, message: 'No hay datos para exportar' };
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: 'Datos exportados a CSV exitosamente' };
  } catch (error) {
    console.error('Error exportando a CSV:', error);
    return { success: false, message: 'Error al exportar a CSV' };
  }
}
