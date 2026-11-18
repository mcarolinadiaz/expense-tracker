import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** The base URL of the public API, such as `http://127.0.0.1:8000/api`. Tests can provide another one. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});
