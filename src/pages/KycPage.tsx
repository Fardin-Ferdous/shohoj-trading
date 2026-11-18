import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, FileCheck, Home, ShieldCheck, Upload } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { TEXTS } from '../texts';
import { formatShortDate } from '../utils/formatters';
import { validateKycFile } from '../utils/validators';
import { StatusBadge, StatusTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/States';

export function KycPage() {
  const navigate = useNavigate();
  const { db, settings, currentUser, submitKyc, simulateKycDecision } = useApp();

  const existing = currentUser
    ? db.kycRecords.find((k) => k.userId === currentUser.id)
    : undefined;

  const [idType, setIdType] = useState<'National ID' | 'Passport' | 'Driving License'>(
    existing?.idDocumentType ?? 'National ID'
  );
  const [idFileName, setIdFileName] = useState(existing?.idDocumentName ?? '');
  const [selfieFileName, setSelfieFileName] = useState(existing?.selfieFileName ?? '');
  const [addressLine, setAddressLine] = useState(existing?.addressLine ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [country, setCountry] = useState(
    existing?.country ?? currentUser?.country ?? settings.supportedCountries[0] ?? 'Bangladesh'
  );
  const [addressProofName, setAddressProofName] = useState(existing?.addressProofName ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const rec = db.kycRecords.find((k) => k.userId === currentUser.id);
    setIdType(rec?.idDocumentType ?? 'National ID');
    setIdFileName(rec?.idDocumentName ?? '');
    setSelfieFileName(rec?.selfieFileName ?? '');
    setAddressLine(rec?.addressLine ?? '');
    setCity(rec?.city ?? '');
    setCountry(rec?.country ?? currentUser.country);
    setAddressProofName(rec?.addressProofName ?? '');
    setError('');
  }, [currentUser?.id]);

  if (!currentUser) {
    return (
      <EmptyState
        title="Please log in first"
        message="Log in or pick a demo user in Demo Tools to test the KYC check."
        actionLabel="Go to Log in"
        onAction={() => navigate('/login')}
      />
    );
  }

  const statusToneMap: Record<string, { tone: StatusTone; label: string }> = {
    not_started: { tone: 'neutral', label: 'Not started' },
    in_review: { tone: 'info', label: 'In review' },
    approved: { tone: 'success', label: 'Approved' },
    rejected: { tone: 'danger', label: 'Rejected' },
  };
  const badge = statusToneMap[currentUser.kycStatus] ?? statusToneMap.not_started;

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    onValid: (name: string) => void
  ) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) return;
    const validationErr = validateKycFile(file);
    if (validationErr) {
      setError(validationErr);
      event.target.value = '';
      return;
    }
    onValid(file.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!idFileName) {
      setError('Please upload your ID document (or pick a sample file).');
      return;
    }
    if (!selfieFileName) {
      setError('Please add a selfie photo.');
      return;
    }
    if (!addressLine.trim() || !city.trim() || !addressProofName) {
      setError('Please complete your address and upload a proof of address file.');
      return;
    }

    submitKyc(currentUser.id, {
      idDocumentType: idType,
      idDocumentName: idFileName,
      selfieFileName,
      addressLine: addressLine.trim(),
      city: city.trim(),
      country,
      addressProofName,
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {TEXTS.prototypeExampleTag}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            {TEXTS.kyc.title}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {TEXTS.kyc.subtitle}
          </p>
        </div>
        <StatusBadge tone={badge.tone} label={badge.label} />
      </div>

      {currentUser.kycStatus === 'rejected' && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold">Your last submission was rejected</p>
          <p className="mt-1">
            Reason: {currentUser.kycNote ?? existing?.rejectionReason ?? 'Document was unclear.'}
          </p>
          <p className="mt-1 text-xs">Please upload clear files below and send again.</p>
        </div>
      )}

      {currentUser.kycStatus === 'approved' && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-950 dark:text-white">
                Identity check approved
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Reviewed on{' '}
                {existing?.reviewedAt ? formatShortDate(existing.reviewedAt) : 'Demo record'}. You can
                now continue to your{' '}
                <Link to="/profile" className="text-emerald-600 dark:text-emerald-400 underline">
                  Profile & Broker Account
                </Link>
                .
              </p>
            </div>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: ID Upload */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              1. Government ID document
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="kyc-id-type" className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Document type
            </label>
            <select
              id="kyc-id-type"
              value={idType}
              onChange={(e) => setIdType(e.target.value as typeof idType)}
              className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
            >
              <option value="National ID" className="bg-white dark:bg-[#0d1612]">National ID</option>
              <option value="Passport" className="bg-white dark:bg-[#0d1612]">Passport</option>
              <option value="Driving License" className="bg-white dark:bg-[#0d1612]">Driving License</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Choose ID file</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="sr-only"
                onChange={(e) => handleFileChange(e, setIdFileName)}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setError('');
                setIdFileName('sample_national_id.jpg');
              }}
              className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
            >
              Use sample ID file
            </button>
            {idFileName && (
              <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                Selected: {idFileName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{TEXTS.kyc.fileRules}</p>
        </Card>

        {/* Step 2: Selfie */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              2. Quick selfie check
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Upload selfie photo</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) => handleFileChange(e, setSelfieFileName)}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setError('');
                setSelfieFileName('sample_selfie_clear.jpg');
              }}
              className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
            >
              Simulate selfie capture
            </button>
            {selfieFileName && (
              <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                Captured: {selfieFileName}
              </span>
            )}
          </div>
        </Card>

        {/* Step 3: Address */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Home className="w-5 h-5 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              3. Home address
            </h2>
          </div>

          <Input
            label="Street address"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="House, road, area"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Dhaka"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="kyc-country" className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Country
              </label>
              <select
                id="kyc-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="min-h-[44px] w-full rounded-full px-5 py-2.5 text-base bg-white text-slate-900 border border-slate-300 dark:bg-white/5 dark:text-white dark:border-white/15"
              >
                {settings.supportedCountries.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-[#0d1612]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium border border-slate-300 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Upload address proof</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="sr-only"
                onChange={(e) => handleFileChange(e, setAddressProofName)}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setError('');
                setAddressProofName('sample_utility_bill.pdf');
              }}
              className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
            >
              Use sample bill PDF
            </button>
            {addressProofName && (
              <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                File: {addressProofName}
              </span>
            )}
          </div>
        </Card>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" fullWidth>
          Send for identity check
        </Button>
      </form>

      {/* Prototype testing bar to test all 4 KYC states instantly */}
      <Card padding="sm" className="space-y-3">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Prototype test controls (simulate Verifier review)
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => simulateKycDecision(currentUser.id, 'in_review')}
          >
            Set In Review
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => simulateKycDecision(currentUser.id, 'approved')}
          >
            Set Approved
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              simulateKycDecision(
                currentUser.id,
                'rejected',
                'ID edges were cut off. Please upload the full card.'
              )
            }
          >
            Set Rejected
          </Button>
        </div>
      </Card>
    </div>
  );
}
