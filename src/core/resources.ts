/**
 * Ҳамаи ресурсҳое, ки фронтенд истифода мебарад.
 *
 * `path`  — чӣ тавре ки фронтенд даъват мекунад (src/api/*.js)
 * `table` — номи ҷадвал дар Postgres
 *
 * `ZaminApteka` бо ҳарфи калон навишта шудааст, чунки src/api/aptekaApi.js
 * маҳз ҳаминро мефиристад. Дар Postgres бошад номи ҷадвал бо ҳарфи хурд аст.
 */
export interface ResourceDef {
  path: string;
  table: string;
}

export const RESOURCES: ResourceDef[] = [
  { path: 'users', table: 'users' },
  { path: 'mahsulot', table: 'mahsulot' },
  { path: 'zamin', table: 'zamin' },
  { path: 'ZaminApteka', table: 'zamin_apteka' },
  { path: 'jobs', table: 'jobs' },
  { path: 'notifications', table: 'notifications' },
];
