import React from 'react';
import { Settings, Shield, Key, Webhook, Save } from 'lucide-react';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

export const SettingsPage = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">System & Integration Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Manage WhatsApp Cloud API credentials, webhook verification, and tenant preferences</p>
      </div>

      <Card title="Meta WhatsApp Cloud API Configuration">
        <div className="space-y-4">
          <Input
            label="Meta Phone Number ID"
            placeholder="e.g. 102938475610293"
            defaultValue="102938475610293"
          />

          <Input
            label="WhatsApp Business Account ID (WABA)"
            placeholder="e.g. 987654321098765"
            defaultValue="987654321098765"
          />

          <Input
            label="System User Permanent Access Token"
            type="password"
            defaultValue="EAABsb81938210398471928471928471"
          />

          <div className="pt-2">
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save API Configuration
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Webhook Callback Endpoint">
        <div className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Register this URL in your Meta App Dashboard under WhatsApp &gt; Configuration &gt; Callback URL.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-brand-400 flex items-center justify-between">
            <span>https://your-crm-api-domain.com/api/v1/webhooks/whatsapp</span>
            <Badge color="emerald">GET / POST</Badge>
          </div>

          <Input
            label="Webhook Verify Token (hub.verify_token)"
            defaultValue="your_custom_webhook_verify_token_here"
          />
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
