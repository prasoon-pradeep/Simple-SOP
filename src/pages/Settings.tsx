import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    invoke<string | null>('get_config_value', { key: 'company_name' }).then(val => {
      setCompanyName(val ?? '');
    });
  }, []);

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
        <div className="max-w-lg space-y-8">
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
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand hover:bg-brand-hover text-white font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            {saved ? 'Saved!' : isSaving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
