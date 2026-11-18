import {
  CATEGORY_ERROR,
  CATEGORY_NAME_MAX_LENGTH,
  CategoryErrorCode,
} from '../../categories/category';
import { TRANSACTION_TYPE, TransactionType } from '../../transactions/transaction';

const transactionCount = (count: number) =>
  count === 1 ? '1 transaction' : `${count} transactions`;

export const APP_TEXT = {
  appName: 'Expense Tracker',
  mainNavigation: 'Main navigation',
  pages: {
    overview: 'Overview',
    activity: 'Activity',
    categories: 'Categories',
  },
  actions: {
    addTransaction: 'Add transaction',
    newCategory: 'New category',
    save: 'Save',
    saveAndAddAnother: 'Save and add another',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    close: 'Close',
    clearFilters: 'Clear filters',
  },
  month: {
    previous: 'Previous month',
    next: 'Next month',
  },
  summary: {
    title: 'Monthly totals',
    currency: 'Currency',
    income: 'Income',
    expenses: 'Expenses',
    balance: 'Balance',
  },
  transactionTypes: {
    [TRANSACTION_TYPE.expense]: 'Expense',
    [TRANSACTION_TYPE.income]: 'Income',
  } satisfies Record<TransactionType, string>,
  transaction: {
    addTitle: 'Add transaction',
    editTitle: 'Edit transaction',
    amount: 'Amount',
    type: 'Type',
    currency: 'Currency',
    category: 'Category',
    newCategoryOption: '+ New category',
    newCategoryName: 'New category name',
    date: 'Date',
    description: 'Description',
    descriptionOptional: 'Description (optional)',
    amountError: 'Enter an amount above 0, with up to 2 decimals.',
    saved: 'Transaction saved',
    deleted: 'Transaction deleted',
  },
  categoryErrors: {
    [CATEGORY_ERROR.required]: 'Enter a category name.',
    [CATEGORY_ERROR.tooLong]: `Use up to ${CATEGORY_NAME_MAX_LENGTH} characters.`,
    [CATEGORY_ERROR.taken]: 'You already have a category with that name.',
    [CATEGORY_ERROR.inUse]: 'This category still has transactions.',
  } satisfies Record<CategoryErrorCode, string>,
  activity: {
    filters: 'Filters',
    search: 'Search',
    searchHint: 'Description',
    allTypes: 'All',
    allCategories: 'All',
    allCurrencies: 'All',
    actions: 'Actions',
    confirmDelete: 'Delete?',
    count: transactionCount,
    perCurrency:
      'Choose a currency to see its totals in Overview. ARS and USD are never added together.',
    emptyTitle: 'No transactions this month yet',
    emptyBody: 'Add your first income or expense and it will appear here.',
    noResultsTitle: 'No transactions found',
    noResultsBody: 'Try different filters or another month.',
  },
  categories: {
    create: 'Create',
    rename: 'Rename',
    newName: 'New name',
    list: 'Your categories',
    uses: (count: number) => (count === 0 ? 'No transactions' : transactionCount(count)),
    viewTransactions: 'View transactions',
    created: 'Category created',
    renamed: 'Category renamed',
    deleted: 'Category deleted',
    emptyTitle: 'No categories yet',
    emptyBody: 'Create one here, or while adding a transaction.',
  },
} as const;
