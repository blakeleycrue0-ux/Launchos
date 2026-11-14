import type { Dict } from './es';

export const en: Dict = {
  'common.back': 'Back', 'common.cancel': 'Cancel', 'common.clear': 'Clear', 'common.close': 'Close',
  'common.continue': 'Continue', 'common.delete': 'Delete', 'common.retry': 'Try again', 'common.save': 'Save', 'common.skip': 'Skip for now',
  'error.generic': 'Something went wrong. Please try again.',
  'error.loadTitle': "We couldn't load your data", 'error.loadBody': 'Check your connection and try again. Nothing has been lost.',
  'date.today': 'Today', 'date.yesterday': 'Yesterday',

  'welcome.tagline': 'Your money, made clear.', 'welcome.start': 'Get started', 'welcome.haveAccount': 'Already have an account?', 'welcome.login': 'Log in',
  'welcome.localNote': 'Your data is stored only on this device.',

  'auth.loginTitle': 'Welcome back', 'auth.loginSub': 'Sign in to see your money.', 'auth.loginCta': 'Log in',
  'auth.signupTitle': 'Create your account', 'auth.signupSub': 'With your email. No cards or bank passwords.', 'auth.signupCta': 'Create account',
  'auth.forgotTitle': 'Reset password', 'auth.forgotSub': "We'll email you a link to create a new one.", 'auth.forgotCta': 'Send link',
  'auth.email': 'Email', 'auth.password': 'Password', 'auth.forgot': 'Forgot your password?', 'auth.noAccount': "Don't have an account?",
  'auth.errEmail': 'Enter a valid email.', 'auth.errPassword': 'Password must be at least 8 characters.',
  'auth.confirmEmail': "We've sent you an email. Confirm it to sign in.", 'auth.resetSent': 'If the email exists, you will get a link in a few minutes.',
  'auth.legal': 'By continuing you accept the Terms and Privacy Policy (pending legal review).',

  'intents.title': 'What do you want to organise?', 'intents.sub': 'Pick as many as you like. You can change this any time.',
  'intents.expenses': 'My spending', 'intents.saving': 'Saving money', 'intents.recurring': 'Bills and subscriptions', 'intents.friends': 'Money with friends', 'intents.couple': 'Money as a couple',

  'setup.title': 'Your starting point', 'setup.sub': 'Everything is optional. You can change it later.', 'setup.name': 'Name', 'setup.currency': 'Currency',
  'setup.balance': 'Starting balance', 'setup.income': 'Usual monthly income', 'setup.later': 'Recurring payments and savings goals will be set up from their own section.',
  'setup.skip': 'Skip and set up later', 'setup.errAmount': 'Check the amounts: numbers only.', 'setup.mainAccount': 'Main account',

  'ready.title': 'Your space is ready', 'ready.titleName': "You're all set, {name}",
  'ready.intro': "I'm Mio. I'll help you see how much you can really spend, not just how much you have.",
  'ready.income': 'Usual income: {amount} a month.', 'ready.noIncome': "You haven't added your usual income yet.",
  'ready.assistantNote': "The question-answering assistant isn't active yet. For now I keep your accounts and calculations.", 'ready.cta': 'Enter my space',

  'tab.home': 'Home', 'tab.transactions': 'Activity', 'tab.accounts': 'Accounts', 'tab.settings': 'Settings',

  'home.morning': 'Good morning', 'home.afternoon': 'Good afternoon', 'home.night': 'Good evening',
  'home.available': 'Available to spend', 'home.availableHint': 'Your account balance, minus anything you have set aside.',
  'home.negative': 'Your accounts are below what is set aside.',
  'home.expense': 'Expense', 'home.income': 'Income', 'home.transfer': 'Transfer',
  'home.emptyTitle': 'No transactions yet', 'home.emptyBody': 'Log your first expense or income and your available amount will update.', 'home.emptyCta': 'Add transaction',
  'home.inAccounts': 'Money in accounts', 'home.thisMonth': 'This month', 'home.incomeLabel': 'Income', 'home.spendingLabel': 'Spending', 'home.balanceMonth': 'Month balance',
  'home.recent': 'Recent activity', 'home.seeAll': 'See all',

  'tx.title': 'Activity', 'tx.search': 'Search', 'tx.allTime': 'All time', 'tx.byMonth': 'By month', 'tx.category': 'Category', 'tx.account': 'Account',
  'tx.allCategories': 'All categories', 'tx.allAccounts': 'All accounts', 'tx.prevMonth': 'Previous month', 'tx.nextMonth': 'Next month',
  'tx.emptyTitle': 'No activity', 'tx.emptyBody': 'Every expense and income you log will show up here.', 'tx.noResults': 'Nothing matches these filters', 'tx.exportCsv': 'Export CSV',

  'add.title': 'New transaction', 'add.edit': 'Edit transaction', 'add.amount': 'Amount', 'add.description': 'Description (optional)', 'add.notes': 'Notes',
  'add.more': 'More details', 'add.recurring': 'This is a recurring payment', 'add.account': 'Account', 'add.toAccount': 'Destination account',
  'add.prevDay': 'Previous day', 'add.nextDay': 'Next day', 'add.realBalance': 'Actual balance of {account}', 'add.adjustDiff': 'Adjustment: {diff}',
  'add.deleteTitle': 'Delete this transaction?', 'add.deleteBody': 'Balances will be recalculated. This cannot be undone.',
  'add.save.expense': 'Save expense', 'add.save.income': 'Save income', 'add.save.transfer': 'Save transfer', 'add.save.refund': 'Save refund',
  'add.save.adjustment': 'Adjust balance', 'add.save.debt_payment': 'Save payment',

  'kind.expense': 'Expense', 'kind.income': 'Income', 'kind.transfer': 'Transfer', 'kind.refund': 'Refund', 'kind.adjustment': 'Balance adjustment', 'kind.debt_payment': 'Debt payment',
  'err.amount_required': 'Enter an amount greater than zero.', 'err.account_required': 'Choose an account.', 'err.transfer_needs_two_accounts': 'Choose the destination account.',
  'err.transfer_same_account': 'Source and destination must differ.', 'err.transfer_has_category': "A transfer can't have a category.",
  'err.invalid_date': 'The date is not valid.', 'err.currency_mismatch': 'Accounts must use the same currency.', 'err.unknown_account': 'That account no longer exists.',

  'cat.food': 'Food', 'cat.transport': 'Transport', 'cat.housing': 'Housing', 'cat.leisure': 'Leisure', 'cat.shopping': 'Shopping', 'cat.health': 'Health',
  'cat.education': 'Education', 'cat.subscriptions': 'Subscriptions', 'cat.travel': 'Travel', 'cat.other': 'Other',
  'cats.new': 'New category', 'cats.add': 'Add category', 'cats.hide': 'Hide', 'cats.hideTitle': 'Hide this category?', 'cats.hideBody': 'Existing transactions keep it; it will no longer appear when choosing.',

  'acc.title': 'Accounts', 'acc.total': 'Total money', 'acc.totalHint': "Includes savings accounts. Transfers between your accounts don't count as spending.",
  'acc.empty': "You don't have any accounts.", 'acc.new': 'New account', 'acc.edit': 'Edit account', 'acc.name': 'Name', 'acc.kind': 'Type', 'acc.initial': 'Starting balance',
  'acc.archived': 'Archived', 'acc.archive': 'Archive account', 'acc.restore': 'Restore account', 'acc.archiveTitle': 'Archive this account?',
  'acc.archiveBody': "It will stop counting towards your available money. Its history is kept.", 'acc.errName': 'Give the account a name.', 'acc.errLast': 'You need at least one active account.',
  'acc.savingsHint': "Savings accounts don't count as money available to spend.",
  'accountKind.bank': 'Bank account', 'accountKind.cash': 'Cash', 'accountKind.savings': 'Savings', 'accountKind.other': 'Other',

  'set.title': 'Settings', 'set.profile': 'Profile', 'set.localMode': 'Local mode: no account, data stays on this device.', 'set.preferences': 'Preferences',
  'set.currency': 'Currency', 'set.currencyLocked': "Can't be changed once you have transactions.", 'set.language': 'Language', 'set.theme': 'Theme',
  'set.themeAuto': 'Automatic', 'set.themeLight': 'Light', 'set.themeDark': 'Dark', 'set.home': 'Home screen', 'set.data': 'Your data', 'set.categories': 'Categories',
  'set.exportCsv': 'Export transactions (CSV)', 'set.exportJson': 'Export all my data (JSON)', 'set.privacy': 'Privacy and account',
  'set.privacyLocal': 'Your data lives only on this device. MIO never asks for or stores bank credentials.',
  'set.privacyCloud': 'Your data is stored encrypted in your account and only you can see it. MIO never asks for or stores bank credentials.',
  'set.signOut': 'Log out', 'set.deleteAccount': 'Delete account', 'set.deleteTitle': 'Delete your account?', 'set.deleteBody': 'Your account and all your data will be permanently deleted.',
  'set.wipe': 'Erase all my data', 'set.wipeTitle': 'Erase all your data?', 'set.wipeBody': 'Accounts and transactions on this device will be permanently deleted.',
  'set.modeLocal': 'local mode', 'set.modeCloud': 'signed in',
};
