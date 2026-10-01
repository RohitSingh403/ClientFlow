import { markOverdueInvoices } from '../services/invoices.js';

const MINUTE = 60 * 1000;

export function startJobs() {
  const run = () => {
    markOverdueInvoices().catch((error) => {
      console.error('Overdue invoice job failed:', error.message);
    });
  };
  run();
  const timer = setInterval(run, MINUTE);
  timer.unref?.();
  return timer;
}
