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

interface UpdateInfo {
  version: string;
  body: string | null;
}

function UpdateDialog({ update, onDismiss }: { update: UpdateInfo; onDismiss: () => void }) {
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const available = await check();
      if (available) {
        await available.downloadAndInstall();
        await relaunch();
      }
    } catch {
      setInstalling(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !installing && onDismiss()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Available — v{update.version}</DialogTitle>
          <DialogDescription className="pt-2 text-text-secondary">
            A new version of SOP Builder is available. Would you like to install it now?
          </DialogDescription>
        </DialogHeader>
        {update.body && (
          <pre className="text-[11px] leading-relaxed text-text-secondary bg-surface border border-border-standard rounded-md p-3 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
            {update.body}
          </pre>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onDismiss} disabled={installing} className="text-text-tertiary">
            Later
          </Button>
          <Button onClick={handleInstall} disabled={installing} className="bg-brand hover:bg-brand-hover text-white font-semibold">
            {installing ? 'Installing…' : 'Install & Restart'}
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
    }).catch(() => {
      // silently ignore — no network or endpoint not yet live
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
