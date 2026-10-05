import dataSource from '../data-source';
import { runSeed } from './seed-data';

void runSeed(dataSource).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Seed failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
