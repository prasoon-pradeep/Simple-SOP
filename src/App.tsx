import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Editor from "./pages/Editor";
import Home from "./pages/Home";
import Viewer from "./pages/Viewer";
import Settings from "./pages/Settings";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const RELEASES_URL = 'https://github.com/prasoon-pradeep/Simple-SOP/releases/latest';

interface UpdateInfo {
  version: string;
  body: string | null;
}

type InstallStage = 'idle' | 'downloading' | 'verifying' | 'applying' | 'error';

function formatUpdateError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function UpdateDialog({ update, onDismiss }: { update: UpdateInfo; onDismiss: () => void }) {
  const [stage, setStage] = useState<InstallStage>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const isInstalling = ['downloading', 'verifying', 'applying'].includes(stage);
  const buttonLabel =
    stage === 'downloading'
      ? `Downloading...${progress > 0 ? ` ${progress}%` : ''}`
      : stage === 'verifying'
        ? 'Verifying...'
        : stage === 'applying'
          ? 'Restarting shortly...'
          : 'Install & Restart';

  const handleInstall = async () => {
    setStage('downloading');
    setProgress(0);
    setErrorMsg('');
    try {
      const available = await check();
      if (!available) {
        throw new Error('Update no longer available.');
      }

      let downloaded = 0;
      let total = 0;
      await available.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
          setStage('downloading');
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) setProgress(Math.round((downloaded / total) * 100));
        } else if (event.event === 'Finished') {
          setStage('verifying');
          setTimeout(() => setStage('applying'), 800);
        }
      });
      await relaunch();
    } catch (error) {
      console.error('Update install failed:', error);
      setErrorMsg(formatUpdateError(error));
      setStage('error');
      setProgress(0);
    }
  };

  const handleDismiss = () => {
    if (!isInstalling) {
      onDismiss();
      setStage('idle');
      setProgress(0);
      setErrorMsg('');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Available - v{update.version}</DialogTitle>
          <DialogDescription className="pt-2 text-text-secondary">
            A new version of SOP Builder is available. Would you like to install it now?
          </DialogDescription>
        </DialogHeader>
        {update.body && (
          <pre className="text-[11px] leading-relaxed text-text-secondary bg-surface border border-border-standard rounded-md p-3 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
            {update.body}
          </pre>
        )}
        {stage === 'downloading' && progress > 0 && (
          <div className="w-full h-1 bg-border-standard rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {stage === 'error' && (
          <div className="space-y-2 rounded-md border border-status-red-bg bg-status-red-bg/40 p-3">
            <p className="text-xs font-semibold text-status-red">Update failed.</p>
            {errorMsg && (
              <pre className="text-[11px] leading-relaxed text-status-red whitespace-pre-wrap font-mono">
                {errorMsg}
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
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleDismiss} disabled={isInstalling} className="text-text-tertiary">
            Later
          </Button>
          <Button onClick={handleInstall} disabled={isInstalling} className="bg-brand hover:bg-brand-hover text-white font-semibold">
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function App() {
  const [pendingUpdate, setPendingUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    check().then((update) => {
      if (update?.available) {
        setPendingUpdate({ version: update.version, body: update.body ?? null });
      }
    }).catch((error) => {
      console.error('Startup update check failed:', error);
    });
  }, []);

  return (
    <>
      {pendingUpdate && (
        <UpdateDialog update={pendingUpdate} onDismiss={() => setPendingUpdate(null)} />
      )}
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sop/:id/edit" element={<Editor />} />
          <Route path="/sop/:id/view" element={<Viewer />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
