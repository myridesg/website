import { handleReportRequest, type ReportEnv } from './report.ts'

// Runs only for /r/* (assets.run_worker_first in wrangler.jsonc). Every other
// address is served from dist/ without reaching this code.
export default {
  fetch: (request: Request, env: ReportEnv) => handleReportRequest(request, env),
}
