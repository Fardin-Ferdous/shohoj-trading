export const TEXTS = {
  brandName: 'Shohoj Trading',
  prototypeBanner: 'Prototype demo. All data is fake. No real money or accounts.',
  prototypeExampleTag: 'Prototype example - not final',
  exnessMethodTag: 'Example method - to be confirmed with Exness',
  riskWarningShort:
    'Trading has risk. You can lose money. Past results do not promise future results.',
  riskWarningFull:
    'Trading is risky. Profit is never guaranteed. Past performance does not guarantee future results. Your money stays in your own Exness account.',
  noPasswordRule: 'We never ask for your MT5 master password. Ever.',

  nav: {
    howItWorks: 'How it works',
    traders: 'Find Traders',
    calculator: 'Profit Calculator',
    faq: 'FAQ',
    login: 'Log in',
    signup: 'Sign up',
    dashboard: 'Dashboard',
    requests: 'My Requests',
    connections: 'Connections',
    disputes: 'Disputes & Support',
    notifications: 'Alerts',
    security: 'Security',
    profile: 'Profile & Broker',
    kyc: 'ID Check (KYC)',
    proProfile: 'My Trader Profile',
    adminHome: 'Admin Overview',
    adminUsers: 'Users',
    adminVerify: 'Verify Traders',
    adminSettings: 'Settings',
    adminFinance: 'Finance',
    adminLaunch: 'Launch Checklist',
  },

  landing: {
    heroTitleBefore: 'Connect with verified traders.',
    heroTitleHighlight: 'Keep control',
    heroTitleAfter: 'of your own account.',
    heroSubtitle:
      'Shohoj Trading connects New Traders who have an Exness MT5 account with verified Professional Traders. Your money stays with your broker at all times.',
    ctaNewTrader: 'I am a New Trader',
    ctaProTrader: 'I am a Professional Trader',
    ctaBrowse: 'Browse sample flow',
    stepsTitle: 'How it works in 4 simple steps',
    steps: [
      {
        number: '01',
        title: 'Pick a verified trader',
        description:
          'Check real trading history, drawdown, and risk tags before you decide.',
      },
      {
        number: '02',
        title: 'Send a Request to Connect',
        description:
          'Share your starting balance and view the exact profit split before sending.',
      },
      {
        number: '03',
        title: 'Talk and sign together',
        description:
          'Chat inside Shohoj Trading, agree on risk limits, and sign a clear agreement.',
      },
      {
        number: '04',
        title: 'Share only new profit',
        description:
          'Your money stays in your own Exness MT5 account. Only new realized profit is shared.',
      },
    ],
    notTitle: 'What Shohoj Trading is NOT',
    notSubtitle: 'Clear rules so you always know how your money and account stay safe.',
    notItems: [
      {
        title: 'Not a broker',
        description:
          'Exness holds your trading account and MT5 runs the trades. We only connect people.',
      },
      {
        title: 'Never holds your money',
        description:
          'You never send trading deposits to Shohoj Trading or to a Professional Trader.',
      },
      {
        title: 'Never asks for master passwords',
        description:
          'Only broker-approved access options are used. You can stop access in one click.',
      },
      {
        title: 'No promised profit',
        description:
          'Every market has real risk. We show losses and drawdown honestly next to gains.',
      },
    ],
    splitSectionTitle: 'Clear profit sharing from Settings',
    splitSectionSubtitle:
      'Every limit and share rule lives in one central Settings store—nothing is hidden or locked in fine print.',
    faqTitle: 'Common questions',
    faqs: [
      {
        q: 'Does Shohoj Trading hold my deposit?',
        a: 'No. Your deposit stays inside your own Exness account with MT5. Shohoj Trading is only the marketplace where you connect and agree on terms.',
      },
      {
        q: 'Do I have to give my MT5 master password?',
        a: 'Never. Shohoj Trading never asks for, stores, or passes on an MT5 master password. Only approved broker connection options are allowed.',
      },
      {
        q: 'How is the platform commission paid?',
        a: 'Only when there is new realized profit above your past peak. The platform commission is taken from the Professional Trader share, so you are never charged extra.',
      },
      {
        q: 'Can I stop a connection whenever I want?',
        a: 'Yes. You can pause or stop access at any time using the stop button and the agreed notice rule.',
      },
    ],
  },

  auth: {
    loginTitle: 'Log in to your account',
    loginSubtitle: 'Use a sample account below or enter your email and password.',
    signupTitle: 'Create your account',
    signupSubtitle: 'Choose your role and finish the quick safety checks to get started.',
    passwordHashingNote:
      'Prototype note: Passwords are stored locally for demo testing and are not hashed on a real server.',
    twoStepTitle: 'Two-step security check',
    twoStepSubtitle: 'Enter the 6-digit code to finish logging in.',
    forgotTitle: 'Reset your password',
    forgotSubtitle: 'Enter your email address to get a demo reset code.',
  },

  kyc: {
    title: 'Identity check (KYC)',
    subtitle: 'Confirm who you are before starting a connection.',
    fileRules: 'Accepted files: JPG, PNG, or PDF up to 5 MB.',
  },

  profile: {
    title: 'Profile & Broker Account',
    subtitle: 'Keep your goals up to date and link your Exness MT5 account safely.',
    demoRejectedMsg:
      'Only real trading accounts are allowed. Demo trading accounts cannot be linked.',
  },

  security: {
    title: 'Account Security',
    subtitle: 'Manage your password, two-step login, active devices, and login history.',
  },

  helpTips: {
    drawdown: 'The biggest drop from a high point. Smaller is safer.',
    profitFactor: 'Total wins divided by total losses. Above 1.5 shows steady gains.',
    winRate: 'How many trades closed in profit. A high win rate alone does not mean profit.',
    highWaterMark: 'Fees only apply to new profit above your highest past balance.',
    shohojScore: 'A balanced score mixing profit, risk habits, and drawdown—never win rate alone.',
    commission: 'Paid out of the Professional Trader share only when new profit is made.',
    twoFactor: 'Adds a 6-digit check when logging in. Required for Professional Traders and Admins.',
  },

  states: {
    loadingTitle: 'Loading view',
    loadingText: 'Getting the latest saved data...',
    emptyTitle: 'Nothing here yet',
    emptyText: 'No items match this view right now.',
    errorTitle: 'Something did not load',
    errorText: 'Please try again or reset the demo data from Demo Tools.',
    retryButton: 'Try again',
  },

  demoTools: {
    title: 'Demo Tools',
    roleLabel: 'Switch role',
    userLabel: 'Switch demo user',
    timeLabel: 'Simulated clock',
    resetButton: 'Reset demo data',
    resetConfirm: 'Demo data reset to starting state.',
    plus7Days: '+7 days',
    plus1Month: '+1 month',
  },

  footer: {
    tagline: 'A transparent marketplace connecting New Traders and verified Professional Traders.',
    legalHeading: 'Trust & Legal',
    exploreHeading: 'Explore',
    links: {
      howItWorks: 'How it works',
      faq: 'FAQ',
      contact: 'Contact & Help',
      terms: 'Terms of Use',
      risk: 'Risk Warning',
      privacy: 'Privacy Policy',
      advertising: 'Advertising Rules',
    },
  },

  requests: {
    titleNew: 'My Requests',
    titlePro: 'Incoming Requests',
    subtitleNew: 'Send a Request to Connect and track every status change.',
    subtitlePro: 'Review incoming New Trader requests and accept or reject clearly.',
    contactHiddenNote: 'Contact details stay hidden until the Professional Trader accepts the request.',
  },

  notifications: {
    title: 'Alerts & Notifications',
    subtitle: 'Track request updates, expiry alerts, and account security events.',
  },

  calculator: {
    title: 'Profit Calculator',
    subtitle: 'Test real numbers step by step using live Settings and High-Water Mark rules.',
  },

  connections: {
    title: 'Chat, Agreements & Access',
    subtitle: 'Talk safely inside Shohoj Trading, sign clear terms, and control broker access.',
    safeChatPrefix: 'Keep talking here. Commission applies to profit from connections started here for',
    lockedSnapshotNote: 'Locked agreement snapshot: changing platform Settings later will not alter this signed agreement.',
    lossResponsibility:
      'Trading has real risk. You (the New Trader) are responsible for losses inside your own Exness MT5 account. Neither Shohoj Trading nor the Professional Trader guarantees profit.',
    disputeRule:
      'If a disagreement happens, keep your chat messages and open a Support dispute inside Shohoj Trading so an Admin can review the timeline and numbers.',
  },
} as const;
