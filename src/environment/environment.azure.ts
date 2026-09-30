import { apiBaseUrl } from './runtime-config';

export const environment = {
  production: true,
  get baseUrl(): string { return apiBaseUrl(); },
};
