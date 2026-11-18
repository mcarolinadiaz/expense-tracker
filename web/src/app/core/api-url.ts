import { inject, InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

const API_DOCS_PATH = '/docs/api';

/** The base URL of the public API, such as `http://127.0.0.1:8000/api`. Tests can provide another one. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

/** The page with the API documentation, on the same server as the API, such as `http://127.0.0.1:8000/docs/api`. */
export const API_DOCS_URL = new InjectionToken<string>('API_DOCS_URL', {
  providedIn: 'root',
  factory: () => new URL(API_DOCS_PATH, inject(API_URL)).href,
});
