interface Window {
  supabase: { createClient(url: string, key: string, options?: object): any };
  React: any;
  ReactDOM: any;
  htm: { bind(h: (...args: any[]) => any): (strings: TemplateStringsArray, ...values: any[]) => any };
}
