import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  LifeBuoy,
  Scale,
  Search,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { formatShortDate } from '../utils/formatters';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { RiskWarningNotice } from '../components/ui/RiskBanner';

interface LegalPageProps {
  pageKey:
    | 'how_it_works'
    | 'faq'
    | 'help'
    | 'contact'
    | 'terms'
    | 'risk'
    | 'privacy'
    | 'advertising';
}

interface HelpTopic {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'ht-1',
    category: 'Getting Started',
    question: 'Who is a New Trader and who is a Professional Trader?',
    answer:
      'A New Trader has an Exness MT5 account and wants to follow a verified trader while keeping full control of their funds. A Professional Trader shares verified real trading history and agrees on clear risk limits before connecting.',
  },
  {
    id: 'ht-2',
    category: 'Exness & Security',
    question: 'Do I ever share my MT5 master password?',
    answer:
      'No. Never share your MT5 master password with Shohoj Trading or with any trader. Only approved broker access methods are used, and you can stop access immediately inside Account Access.',
  },
  {
    id: 'ht-3',
    category: 'Exness & Security',
    question: 'Can I link a Demo Exness account to follow real trades?',
    answer:
      'No. Only real Exness trading accounts are accepted for live connections and verification checks. Demo accounts are automatically rejected.',
  },
  {
    id: 'ht-4',
    category: 'Agreements & Stopping',
    question: 'What happens if Platform Settings change after I sign an agreement?',
    answer:
      'Nothing changes on your active connection. Every signed agreement stores a locked snapshot of the profit split, drawdown limit, notice days, and open-trade rules from the day you sent your request.',
  },
  {
    id: 'ht-5',
    category: 'Agreements & Stopping',
    question: 'How do I stop a connection safely?',
    answer:
      'Open Connections -> Account Access or Active Connections and click Stop & remove access. Broker access stops immediately, and any remaining open trades follow the notice rule inside your signed agreement.',
  },
  {
    id: 'ht-6',
    category: 'Profit Split & High-Water Mark',
    question: 'When do I pay fees? What is the High-Water Mark?',
    answer:
      'Profit split fees only apply when your realized profit reaches a brand-new peak above your High-Water Mark. If your balance drops, no fee is charged while recovering back up to your old high point. Platform commission comes out of the Professional Trader share.',
  },
  {
    id: 'ht-7',
    category: 'Disputes & Reporting',
    question: 'What should I do if someone asks me to chat or pay outside Shohoj Trading?',
    answer:
      'Do not move outside the platform. Keep your chat inside Shohoj Trading and report the user immediately from the Disputes & Support page or inside your chat thread.',
  },
];

const LEGAL_LINKS = [
  { key: 'terms', to: '/legal/terms', label: 'Terms of Use' },
  { key: 'risk', to: '/legal/risk', label: 'Risk Warning' },
  { key: 'privacy', to: '/legal/privacy', label: 'Privacy Policy' },
  { key: 'advertising', to: '/legal/advertising', label: 'Advertising Rules' },
  { key: 'help', to: '/help', label: 'Help Center' },
  { key: 'contact', to: '/contact', label: 'Contact Support' },
];

export function LegalPage({ pageKey }: LegalPageProps) {
  const { db, settings, currentUser, submitContactTicket } = useApp();

  // Help Center search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openTopicIds, setOpenTopicIds] = useState<string[]>(['ht-1', 'ht-2']);

  // Contact form state
  const [contactName, setContactName] = useState(currentUser?.fullName ?? '');
  const [contactEmail, setContactEmail] = useState(currentUser?.email ?? '');
  const [contactTopic, setContactTopic] = useState('Connection or Agreement Question');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  const helpCategories = useMemo(() => {
    return ['All', ...Array.from(new Set(HELP_TOPICS.map((t) => t.category)))];
  }, []);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return HELP_TOPICS.filter((topic) => {
      if (selectedCategory !== 'All' && topic.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        topic.question.toLowerCase().includes(q) ||
        topic.answer.toLowerCase().includes(q) ||
        topic.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  const myTickets = useMemo(() => {
    if (currentUser) {
      return db.contactTickets.filter((t) => t.userId === currentUser.id);
    }
    return db.contactTickets.filter((t) => !t.userId);
  }, [db.contactTickets, currentUser]);

  const toggleTopic = (id: string) => {
    setOpenTopicIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setSubmittedTicketId(null);

    const res = submitContactTicket({
      userId: currentUser?.id,
      name: contactName,
      email: contactEmail,
      topic: contactTopic,
      message: contactMessage,
    });

    if (!res.ok) {
      setContactError(res.error ?? 'Could not send your support request.');
      return;
    }

    setSubmittedTicketId(res.ticketId ?? 'Sent');
    setContactMessage('');
  };

  const contentMap: Record<
    Exclude<LegalPageProps['pageKey'], 'help' | 'contact'>,
    { title: string; subtitle: string; body: string }
  > = {
    how_it_works: {
      title: 'How Shohoj Trading Works',
      subtitle: 'A plain-English overview of how New Traders and Professional Traders connect.',
      body: '1. New Traders keep their money inside their own Exness MT5 account.\n2. Verified Professional Traders share their real trading history.\n3. Both sides chat, review terms, and sign an agreement snapshot.\n4. Only new realized profit above the high-water mark is shared.',
    },
    faq: {
      title: 'Frequently Asked Questions',
      subtitle: 'Simple answers about accounts, safety, and profit sharing.',
      body: TEXTS.landing.faqs.map((item) => `${item.q}\n${item.a}`).join('\n\n'),
    },
    terms: {
      title: 'Terms of Use',
      subtitle: 'Live platform rules managed from Admin Settings.',
      body: settings.termsText,
    },
    risk: {
      title: 'Risk Disclosure',
      subtitle: 'Read carefully before connecting any trading account.',
      body: settings.riskWarningText,
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'How personal details, Exness IDs, and chat records are protected.',
      body: settings.privacyText,
    },
    advertising: {
      title: 'Rules on Advertising',
      subtitle: 'Strict honesty rules for every trader profile and claim.',
      body: settings.advertisingRulesText,
    },
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to home</span>
      </Link>

      {/* Quick navigation strip across legal & help pages */}
      <div className="flex flex-wrap gap-2">
        {LEGAL_LINKS.map((item) => {
          const isCurrent = item.key === pageKey;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`min-h-[36px] inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isCurrent
                  ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                  : 'border-white/12 text-slate-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* HELP CENTER VIEW */}
      {pageKey === 'help' && (
        <>
          <div>
            <p className="text-xs font-medium text-emerald-400">Help Center</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-white">
              Clear answers in plain English
            </h1>
            <p className="mt-2 text-base text-slate-300">
              Search topics about Exness accounts, High-Water Mark profit sharing, and connection safety.
            </p>
          </div>

          <Card padding="md" className="space-y-4">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Help Center (e.g. password, high-water mark, stop, fees)..."
                aria-label="Search Help Center"
                className="min-h-[44px] w-full rounded-full pl-11 pr-4 py-2 text-sm bg-white/5 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {helpCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-400 text-slate-950 border-emerald-400'
                      : 'border-white/15 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-3">
            {filteredTopics.length === 0 ? (
              <Card padding="lg" className="text-center space-y-2">
                <p className="text-sm font-semibold text-white">No help topics matched that search.</p>
                <p className="text-xs text-slate-400">
                  Try another word or send a message directly on our Contact Support page.
                </p>
                <div className="pt-2">
                  <Link to="/contact">
                    <Button size="sm">Contact Support</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              filteredTopics.map((topic) => {
                const isOpen = openTopicIds.includes(topic.id);
                return (
                  <Card key={topic.id} padding="sm" className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-3 text-left py-1 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono text-emerald-400">
                          {topic.category}
                        </span>
                        <p className="text-sm sm:text-base font-semibold text-white">
                          {topic.question}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <p className="text-sm text-slate-300 leading-relaxed pt-2 border-t border-white/10">
                        {topic.answer}
                      </p>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          <Card padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs sm:text-sm text-slate-300">
                Need help with an active connection, profit calculation, or unsafe behavior?
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link to="/disputes">
                <Button variant="secondary" size="sm">
                  Open Dispute / Report
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="sm">Contact Support</Button>
              </Link>
            </div>
          </Card>
        </>
      )}

      {/* CONTACT SUPPORT VIEW */}
      {pageKey === 'contact' && (
        <>
          <div>
            <p className="text-xs font-medium text-emerald-400">Support Desk</p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-white">
              Contact Shohoj Support
            </h1>
            <p className="mt-2 text-base text-slate-300">
              Send a question to our support team or jump to Disputes &amp; Reports for an active connection.
            </p>
          </div>

          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <LifeBuoy className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Send a Support Message</span>
              </span>
              <StatusBadge tone="info" label="Simulated Support Inbox" />
            </div>

            {submittedTicketId && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>
                  Ticket <strong>{submittedTicketId}</strong> saved. View it below in your submitted messages.
                </span>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter your name"
                />
                <Input
                  label="Email address"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-topic" className="text-sm font-medium text-slate-200">
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={contactTopic}
                  onChange={(e) => setContactTopic(e.target.value)}
                  className="min-h-[44px] w-full rounded-full px-4 py-2 text-sm bg-white/5 border border-white/15 text-white"
                >
                  <option value="Connection or Agreement Question" className="bg-[#0d1612]">
                    Connection or Agreement Question
                  </option>
                  <option value="Exness Account & Safety Help" className="bg-[#0d1612]">
                    Exness Account &amp; Safety Help
                  </option>
                  <option value="Settlement or Fee Question" className="bg-[#0d1612]">
                    Settlement or Fee Question
                  </option>
                  <option value="ID Verification (KYC) Help" className="bg-[#0d1612]">
                    ID Verification (KYC) Help
                  </option>
                  <option value="General Feedback" className="bg-[#0d1612]">
                    General Feedback
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-msg" className="text-sm font-medium text-slate-200">
                  How can we help?
                </label>
                <textarea
                  id="contact-msg"
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Describe your question clearly. Never include your MT5 master password..."
                  className="w-full rounded-2xl px-4 py-3 text-sm bg-white/5 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {contactError && <p className="text-xs text-red-400">{contactError}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to="/disputes" className="text-xs font-medium text-sky-400 hover:underline">
                  Need to open a connection dispute or report a user? Go to Disputes →
                </Link>
                <Button type="submit">
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Send message</span>
                </Button>
              </div>
            </form>
          </Card>

          {myTickets.length > 0 && (
            <Card padding="lg" className="space-y-3">
              <h2 className="font-display text-base font-bold text-white">
                Your Support Messages ({myTickets.length})
              </h2>
              <div className="space-y-2.5">
                {myTickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        {t.id} · {t.topic}
                      </span>
                      <StatusBadge tone="success" label={t.status} />
                    </div>
                    <p className="text-slate-300">{t.message}</p>
                    <p className="text-slate-400 font-mono">{formatShortDate(t.createdAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* STANDARD LEGAL & INFO VIEWS */}
      {pageKey !== 'help' && pageKey !== 'contact' && (
        <>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
              {contentMap[pageKey].title}
            </h1>
            <p className="mt-2 text-base text-slate-300">{contentMap[pageKey].subtitle}</p>
          </div>

          <Card padding="lg" className="space-y-4">
            {contentMap[pageKey].body.split('\n\n').map((para, idx) => (
              <p
                key={idx}
                className="text-base text-slate-200 whitespace-pre-line leading-relaxed"
              >
                {para}
              </p>
            ))}

            {settings.legalNoticeText && (
              <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2.5 text-xs text-slate-300">
                <BookOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-white">Platform Legal Notice</p>
                  <p className="mt-1 leading-relaxed">{settings.legalNoticeText}</p>
                </div>
              </div>
            )}
          </Card>

          <Card padding="md" className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-white">Questions about these rules?</p>
              <p>
                Visit the{' '}
                <Link to="/help" className="text-emerald-400 underline">
                  Help Center
                </Link>{' '}
                or{' '}
                <Link to="/contact" className="text-emerald-400 underline">
                  Contact Support
                </Link>
                .
              </p>
            </div>
          </Card>
        </>
      )}

      <RiskWarningNotice full />
    </div>
  );
}
