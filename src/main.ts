import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environment/environment';
import { loadRuntimeConfig } from './environment/runtime-config';

async function start(): Promise<void> {
  if (environment.production) await loadRuntimeConfig();
  await bootstrapApplication(App, appConfig);
}

start().catch((err) => console.error(err));
