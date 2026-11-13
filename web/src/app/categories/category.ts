export const CATEGORY_NAME_MAX_LENGTH = 60;

export interface Category {
  id: number;
  name: string;
}

export const CATEGORY_ERROR = {
  required: 'required',
  tooLong: 'tooLong',
  taken: 'taken',
  inUse: 'inUse',
} as const;

export type CategoryErrorCode = (typeof CATEGORY_ERROR)[keyof typeof CATEGORY_ERROR];

/** A rule the category broke. The code lets the interface show its own translated message. */
export class CategoryError extends Error {
  constructor(readonly code: CategoryErrorCode) {
    super(code);
  }
}
