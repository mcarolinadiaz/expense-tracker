import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LocaleFormat } from '../locale-format.service';

const ACCEPT_LANGUAGE_HEADER = 'Accept-Language';

/** Asks the API for its validation and error messages in the active language. */
export const acceptLanguageInterceptor: HttpInterceptorFn = (request, next) =>
  next(request.clone({ setHeaders: { [ACCEPT_LANGUAGE_HEADER]: inject(LocaleFormat).locale() } }));
