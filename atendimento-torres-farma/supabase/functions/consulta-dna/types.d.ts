// Tipos mínimos do runtime Deno/Supabase usados por esta função.
// Mantidos localmente para não acoplar a função a outro módulo.
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
};

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(url: string, key: string): {
    from(table: string): any;
  };
}
