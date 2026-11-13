interface VistaAsistenciaApi {
  abrir(): void;
  tieneCambiosSinGuardar(): boolean;
}

interface Window {
  VistaAsistencia?: VistaAsistenciaApi;
  supabase: { createClient(url: string, key: string, options?: object): any };
}

declare const htm: { bind(h: (...args: any[]) => any): (strings: TemplateStringsArray, ...values: any[]) => any };
