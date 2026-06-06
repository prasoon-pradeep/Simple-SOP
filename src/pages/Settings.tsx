import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ArrowLeft, Save, ScrollText, RefreshCw, Sparkles, AlertTriangle, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import licenseText from '../../LICENSE?raw';

const AI_PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Gemini' },
] as const;
type ProviderId = typeof AI_PROVIDERS[number]['id'];

const RELEASES_URL = 'https://github.com/prasoon-pradeep/Simple-SOP/releases/latest';

function formatUpdateError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Settings() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [appVersion, setAppVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  type UpdateStatus =
    | 'idle'
    | 'connecting'
    | 'up-to-date'
    | 'available'
    | 'downloading'
    | 'verifying'
    | 'applying'
    | 'error';
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<Awaited<ReturnType<typeof check>>>(null);

  // AI Enhancement state
  const [aiProvider, setAiProvider] = useState<ProviderId>('anthropic');
  const [aiKey, setAiKey] = useState('');
  const [aiKeyMasked, setAiKeyMasked] = useState(false); // true = key exists in store
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiKeyStatus, setAiKeyStatus] = useState<'idle' | 'saving' | 'saved' | 'clearing' | 'testing' | 'ok' | 'error'>('idle');
  const [aiKeyError, setAiKeyError] = useState('');
  const [keyringAvailable, setKeyringAvailable] = useState(true);
  const [keyUsingSqlite, setKeyUsingSqlite] = useState(false);
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [aiModel, setAiModel] = useState('');
  const [aiModelsLoading, setAiModelsLoading] = useState(false);
  const [aiModelsError, setAiModelsError] = useState('');

  useEffect(() => {
    invoke<string | null>('get_config_value', { key: 'company_name' }).then(val => {
      setCompanyName(val ?? '');
    });
    getVersion().then(setAppVersion);
    invoke<string | null>('get_config_value', { key: 'whats_new_notes' }).then(setReleaseNotes).catch(() => {});
    invoke<boolean>('check_keyring_available').then(setKeyringAvailable).catch(() => setKeyringAvailable(false));
    invoke<string | null>('get_config_value', { key: 'ai_active_provider' }).then(p => {
      if (p && AI_PROVIDERS.some(pr => pr.id === p)) setAiProvider(p as ProviderId);
    });
  }, []);

  useEffect(() => {
    let active = true;
    setAiKey('');
    setAiKeyMasked(false);
    setAiKeyStatus('idle');
    setAiKeyError('');
    setAiModels([]);
    setAiModelsError('');
    setAiModel('');
    setKeyUsingSqlite(false);
    const provider = aiProvider;
    invoke<string | null>('get_ai_key', { provider }).then(key => {
      if (!active) return;
      const hasKey = !!key;
      setAiKeyMasked(hasKey);
      if (hasKey) {
        loadModels(provider);
        invoke<string | null>('get_config_value', { key: `ai_model_${provider}` })
          .then(m => { if (active && m) setAiModel(m); })
          .catch(() => {});
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [aiProvider]);

  const loadModels = async (provider: string) => {
    setAiModelsLoading(true);
    setAiModelsError('');
    setAiModels([]);
    try {
      const models = await invoke<string[]>('list_ai_models', { provider });
      setAiModels(models);
    } catch (err) {
      setAiModelsError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiModelsLoading(false);
    }
  };

  const handleProviderChange = async (p: ProviderId) => {
    setAiProvider(p);
    await invoke('set_config_value', { key: 'ai_active_provider', value: p });
  };

  const handleSetKey = async () => {
    if (!aiKey.trim()) return;
    setAiKeyStatus('saving');
    try {
      const usedKeyring = await invoke<boolean>('set_ai_key', { provider: aiProvider, apiKey: aiKey.trim() });
      setAiKeyMasked(true);
      setAiKey('');
      setAiKeyStatus('saved');
      setKeyUsingSqlite(!usedKeyring);
      setTimeout(() => setAiKeyStatus('idle'), 2000);
      loadModels(aiProvider);
    } catch (err) {
      setAiKeyError(err instanceof Error ? err.message : String(err));
      setAiKeyStatus('error');
    }
  };

  const handleClearKey = async () => {
    setAiKeyStatus('clearing');
    try {
      await invoke('delete_ai_key', { provider: aiProvider });
      setAiKeyMasked(false);
      setAiKey('');
      setAiKeyStatus('idle');
      setAiModels([]);
      setAiModel('');
    } catch (err) {
      setAiKeyError(err instanceof Error ? err.message : String(err));
      setAiKeyStatus('error');
    }
  };

  const handleTestConnection = async () => {
    const keyToTest = aiKey.trim() || null;
    if (!keyToTest && !aiKeyMasked) return;
    setAiKeyStatus('testing');
    setAiKeyError('');
    try {
      let testKey = keyToTest;
      if (!testKey) {
        testKey = await invoke<string | null>('get_ai_key', { provider: aiProvider });
      }
      if (!testKey) {
        setAiKeyError('No key found. Save a key first.');
        setAiKeyStatus('error');
        return;
      }
      await invoke('test_ai_connection', { provider: aiProvider, apiKey: testKey });
      setAiKeyStatus('ok');
      setTimeout(() => setAiKeyStatus('idle'), 3000);
    } catch (err) {
      setAiKeyError(err instanceof Error ? err.message : String(err));
      setAiKeyStatus('error');
    }
  };

  const handleCheckForUpdates = async () => {
    setUpdateStatus('connecting');
    setUpdateVersion('');
    setDownloadProgress(0);
    setUpdateError('');
    setPendingUpdate(null);
    try {
      const update = await check();
      if (update?.available) {
        setUpdateVersion(update.version);
        setPendingUpdate(update);
        setUpdateStatus('available');
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch (error) {
      console.error('Update check failed:', error);
      setUpdateError(formatUpdateError(error));
      setUpdateStatus('error');
    }
  };

  const handleInstallUpdate = async () => {
    const update = pendingUpdate;
    if (!update) return;
    setDownloadProgress(0);
    setUpdateError('');
    try {
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
          setUpdateStatus('downloading');
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) setDownloadProgress(Math.round((downloaded / total) * 100));
        } else if (event.event === 'Finished') {
          setUpdateStatus('verifying');
          setTimeout(() => setUpdateStatus('applying'), 800);
        }
      });
      await relaunch();
    } catch (error) {
      console.error('Update install failed:', error);
      setUpdateError(formatUpdateError(error));
      setUpdateStatus('error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoke('set_config_value', { key: 'company_name', value: companyName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-12 bg-surface border-b border-border-standard flex items-center px-6 shrink-0 gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
        <span className="text-sm font-semibold text-text-primary">Settings</span>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-lg space-y-10">

          {/* Organisation */}
          <div>
            <h2 className="text-base font-semibold text-text-primary mb-1">Organisation</h2>
            <p className="text-xs text-text-tertiary mb-4">Appears in the PDF header on every exported document.</p>
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-sm text-text-secondary">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="My Company"
                className="max-w-sm"
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="mt-4 bg-brand hover:bg-brand-hover text-white font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {saved ? 'Saved!' : isSaving ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>

          <div className="border-t border-border-standard" />

          {/* AI Enhancement */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-base font-semibold text-text-primary">AI Enhancement</h2>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              Adds a sparkle icon to prose fields. Rewrites text using your own API key — your SOP data is never stored by the provider.
            </p>

            {(!keyringAvailable || keyUsingSqlite) && (
              <div className="flex items-start gap-2 rounded-md border border-status-amber-bg bg-status-amber-bg/40 p-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-status-amber shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary">
                  {keyUsingSqlite
                    ? 'The system keyring could not be verified. Your API key is stored in plaintext in the local database.'
                    : 'Secure keyring not available on this system. API keys will be stored in plaintext in the local database.'}
                </p>
              </div>
            )}

            {/* Provider selector */}
            <div className="space-y-2 mb-4">
              <Label className="text-sm text-text-secondary">Provider</Label>
              <div className="flex gap-4">
                {AI_PROVIDERS.map(p => (
                  <label key={p.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="ai-provider"
                      value={p.id}
                      checked={aiProvider === p.id}
                      onChange={() => handleProviderChange(p.id)}
                      className="accent-brand"
                    />
                    <span className="text-sm text-text-secondary">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Key input */}
            <div className="space-y-2 mb-3">
              <Label className="text-sm text-text-secondary">API Key</Label>
              {aiKeyMasked && !aiKey ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 max-w-sm h-9 rounded-md border border-border-standard bg-secondary px-3 flex items-center">
                    <span className="text-sm text-text-quaternary tracking-widest">••••••••••••••••••••</span>
                  </div>
                  <Button variant="outline" size="sm" className="border-border-strong text-xs" onClick={() => setAiKeyMasked(false)}>
                    Replace
                  </Button>
                  <Button variant="outline" size="sm" className="border-border-strong text-xs text-status-red hover:text-status-red" onClick={handleClearKey} disabled={aiKeyStatus === 'clearing'}>
                    {aiKeyStatus === 'clearing' ? 'Clearing…' : 'Clear'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative max-w-sm flex-1">
                    <Input
                      type={showAiKey ? 'text' : 'password'}
                      value={aiKey}
                      onChange={e => { setAiKey(e.target.value); setAiKeyStatus('idle'); setAiKeyError(''); }}
                      placeholder="Paste your API key"
                      className="pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAiKey(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-quaternary hover:text-text-secondary"
                    >
                      {showAiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSetKey}
                    disabled={!aiKey.trim() || aiKeyStatus === 'saving'}
                    className="bg-brand hover:bg-brand-hover text-white font-semibold text-xs"
                  >
                    {aiKeyStatus === 'saving' ? 'Saving…' : 'Save Key'}
                  </Button>
                </div>
              )}
            </div>

            {/* Test connection */}
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                className="border-border-strong text-xs font-semibold"
                onClick={handleTestConnection}
                disabled={(!aiKey.trim() && !aiKeyMasked) || aiKeyStatus === 'testing'}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${aiKeyStatus === 'testing' ? 'animate-spin' : ''}`} />
                Test Connection
              </Button>
              {aiKeyStatus === 'saved' && <span className="text-xs text-status-green font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Key saved.</span>}
              {aiKeyStatus === 'ok' && <span className="text-xs text-status-green font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Connected successfully.</span>}
              {aiKeyStatus === 'testing' && <span className="text-xs text-text-tertiary">Connecting…</span>}
              {aiKeyStatus === 'error' && <span className="text-xs text-status-red">{aiKeyError}</span>}
            </div>

            {/* Model selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-text-secondary">Model</Label>
                {aiKeyMasked && (
                  <button
                    type="button"
                    onClick={() => loadModels(aiProvider)}
                    disabled={aiModelsLoading}
                    className="text-xs text-brand hover:underline disabled:opacity-50"
                  >
                    {aiModelsLoading ? 'Loading…' : 'Refresh'}
                  </button>
                )}
              </div>
              {aiModelsError && <p className="text-xs text-status-red">{aiModelsError}</p>}
              {aiModelsLoading ? (
                <div className="h-9 max-w-sm rounded-md border border-border-standard bg-secondary animate-pulse" />
              ) : (
                <Select
                  value={aiModel || '__default__'}
                  disabled={!aiKeyMasked || aiModels.length === 0}
                  onValueChange={async m => {
                    const val = m === '__default__' ? '' : m;
                    setAiModel(val);
                    await invoke('set_config_value', { key: `ai_model_${aiProvider}`, value: val });
                  }}
                >
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder={aiKeyMasked ? 'Loading models…' : 'Save an API key to load models'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">— default —</SelectItem>
                    {aiModels.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {aiModel && (
                <p className="text-[11px] text-text-tertiary">Active: <span className="font-mono font-semibold text-text-secondary">{aiModel}</span></p>
              )}
            </div>

            <p className="text-[11px] text-text-tertiary mt-4">
              By using AI enhancement you agree to your chosen provider's{' '}
              <a href="https://www.anthropic.com/legal/consumer-terms" target="_blank" rel="noreferrer" className="text-brand hover:underline">Anthropic</a>,{' '}
              <a href="https://openai.com/policies/terms-of-use" target="_blank" rel="noreferrer" className="text-brand hover:underline">OpenAI</a>, or{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="text-brand hover:underline">Google</a>{' '}
              terms of service and privacy policy. Your API key and SOP data are sent directly to the provider you configure.
            </p>
          </div>

          <div className="border-t border-border-standard" />

          {/* Updates */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-base font-semibold text-text-primary">Updates</h2>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              Current version: <span className="font-mono font-bold text-text-secondary">v{appVersion || '…'}</span>
            </p>
            {releaseNotes && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">Release notes</p>
                <pre className="text-[11px] leading-relaxed text-text-secondary bg-surface border border-border-standard rounded-md p-3 whitespace-pre-wrap font-mono max-h-36 overflow-y-auto">
                  {releaseNotes}
                </pre>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-border-strong font-semibold"
                  onClick={updateStatus === 'available' ? handleInstallUpdate : handleCheckForUpdates}
                  disabled={['connecting', 'downloading', 'verifying', 'applying'].includes(updateStatus)}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${['connecting', 'downloading', 'verifying', 'applying'].includes(updateStatus) ? 'animate-spin' : ''}`} />
                  {updateStatus === 'available' ? `Install v${updateVersion} & Restart` : 'Check for Updates'}
                </Button>
              </div>

              {updateStatus === 'connecting' && (
                <p className="text-xs text-text-tertiary">Connecting to update server…</p>
              )}
              {updateStatus === 'up-to-date' && (
                <p className="text-xs text-status-green font-semibold">You're on the latest version.</p>
              )}
              {updateStatus === 'available' && (
                <p className="text-xs text-text-secondary">
                  v<span className="font-semibold font-mono">{updateVersion}</span> is available. Click the button above to download and install.
                </p>
              )}
              {updateStatus === 'downloading' && (
                <div className="space-y-1">
                  <p className="text-xs text-text-tertiary">
                    Downloading update{downloadProgress > 0 ? ` — ${downloadProgress}%` : '…'}
                  </p>
                  {downloadProgress > 0 && (
                    <div className="w-48 h-1 bg-border-standard rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-200"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {updateStatus === 'verifying' && (
                <p className="text-xs text-text-tertiary">Verifying download…</p>
              )}
              {updateStatus === 'applying' && (
                <p className="text-xs text-text-tertiary">Applying update — restarting shortly…</p>
              )}
              {updateStatus === 'error' && (
                <div className="space-y-2 rounded-md border border-status-red-bg bg-status-red-bg/40 p-3">
                  <p className="text-xs font-semibold text-status-red">Update failed.</p>
                  {updateError && (
                    <pre className="text-[11px] leading-relaxed text-status-red whitespace-pre-wrap font-mono">
                      {updateError}
                    </pre>
                  )}
                  <p className="text-xs text-text-secondary">
                    You can also download the latest version manually from{' '}
                    <a
                      href={RELEASES_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand hover:underline"
                    >
                      the releases page
                    </a>.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border-standard" />

          {/* Licence Agreement */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-base font-semibold text-text-primary">Licence Agreement</h2>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              By installing and using SOP Builder you agree to the terms of the licence below.
            </p>
            <pre className="text-[11px] leading-relaxed text-text-secondary bg-surface border border-border-standard rounded-md p-4 whitespace-pre-wrap font-mono overflow-y-auto max-h-72">
              {licenseText}
            </pre>
          </div>

          <div className="border-t border-border-standard" />

          {/* Privacy Policy */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-base font-semibold text-text-primary">Privacy Policy</h2>
            </div>
            <p className="text-xs text-text-tertiary mb-4">Last updated: June 2026</p>
            <div className="text-[11px] leading-relaxed text-text-secondary bg-surface border border-border-standard rounded-md p-4 space-y-3">
              <p><span className="font-semibold text-text-primary">We collect nothing.</span> SOP Builder stores all your data locally on your machine in a SQLite database. No personal data, usage data, or SOP content is ever transmitted to or collected by SOP Builder Software.</p>
              <p><span className="font-semibold text-text-primary">AI Enhancement.</span> If you choose to use AI enhancement, the text of the field you are improving is sent directly from your device to the AI provider you configure (Anthropic, OpenAI, or Google) using your own API key. This transmission is governed solely by that provider's terms of service and privacy policy — SOP Builder Software has no visibility into or control over it.</p>
              <p><span className="font-semibold text-text-primary">Auto-updates.</span> On launch, the app contacts the GitHub API to check whether a new version is available. This is a standard HTTPS request from your device to GitHub's servers and is subject to GitHub's privacy policy. No SOP data is included in this request.</p>
              <p><span className="font-semibold text-text-primary">No analytics, no telemetry.</span> The app contains no crash reporters, analytics SDKs, or tracking of any kind.</p>
              <p className="text-text-tertiary">Questions? Open an issue on the <a href="https://github.com/prasoon-pradeep/Simple-SOP/issues" target="_blank" rel="noreferrer" className="text-brand hover:underline">GitHub repository</a>.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
