import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ArrowLeft, Save, ScrollText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import licenseText from '../../LICENSE?raw';

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

  useEffect(() => {
    invoke<string | null>('get_config_value', { key: 'company_name' }).then(val => {
      setCompanyName(val ?? '');
    });
    getVersion().then(setAppVersion);
  }, []);

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

          {/* Updates */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-base font-semibold text-text-primary">Updates</h2>
            </div>
            <p className="text-xs text-text-tertiary mb-4">
              Current version: <span className="font-mono font-bold text-text-secondary">v{appVersion || '…'}</span>
            </p>

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

        </div>
      </div>
    </div>
  );
}
