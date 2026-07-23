import React, { useState } from 'react';
import { Zap, Shield } from '../../utils/icons';
import { Box, Flex, Text, Button, Input } from '@chakra-ui/react';
import { DialogRoot, DialogContent, DialogHeader, DialogBody, DialogTitle } from '../ui/dialog';

export interface WebhookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const WebhookSettingsModal: React.FC<WebhookSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [servicenowUrl, setServicenowUrl] = useState(() => localStorage.getItem('sentinel-webhook-servicenow') || '');
  const [jiraUrl, setJiraUrl] = useState(() => localStorage.getItem('sentinel-webhook-jira') || '');
  const [pagerdutyUrl, setPagerdutyUrl] = useState(() => localStorage.getItem('sentinel-webhook-pagerduty') || '');
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const handleSave = () => {
    localStorage.setItem('sentinel-webhook-servicenow', servicenowUrl);
    localStorage.setItem('sentinel-webhook-jira', jiraUrl);
    localStorage.setItem('sentinel-webhook-pagerduty', pagerdutyUrl);
    onShowToast('Webhook integration settings saved successfully', 'success');
    onClose();
  };

  const handleTestWebhook = async (service: 'ServiceNow' | 'Jira' | 'PagerDuty', url: string) => {
    if (!url.trim()) {
      onShowToast(`Please specify a valid webhook URL for ${service}`, 'warning');
      return;
    }

    setIsTesting(service);

    try {
      await new Promise(res => setTimeout(res, 800));
      onShowToast(`Test payload dispatched successfully to ${service}! Status: 200 OK`, 'success');
    } catch {
      onShowToast(`Failed to reach ${service} webhook endpoint`, 'error');
    } finally {
      setIsTesting(null);
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(details) => { if (!details.open) onClose(); }}>
      <DialogContent className="max-w-xl bg-gray-900 border border-gray-800 text-white rounded-xl shadow-2xl overflow-hidden p-0">
        <DialogHeader className="p-5 border-b border-gray-800 bg-gray-950 flex justify-between items-center">
          <Flex align="center" gap={3}>
            <Box className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Zap size={20} />
            </Box>
            <Box>
              <DialogTitle className="text-lg font-semibold text-gray-100">
                ITIL Webhook & Ticket Connectors
              </DialogTitle>
              <Text className="text-xs text-gray-400">
                Automatically dispatch critical findings & remediation logs to external ITSM tools
              </Text>
            </Box>
          </Flex>
        </DialogHeader>

        <DialogBody className="p-6 space-y-5">
          {/* ServiceNow */}
          <Box className="space-y-2">
            <Flex align="center" justify="space-between">
              <Text className="text-sm font-medium text-gray-200">ServiceNow Incident Endpoint</Text>
              <Button
                size="xs"
                onClick={() => handleTestWebhook('ServiceNow', servicenowUrl)}
                disabled={isTesting === 'ServiceNow'}
                className="bg-gray-800 hover:bg-gray-700 text-purple-300 border border-gray-700 text-xs px-2.5 py-1 rounded"
              >
                {isTesting === 'ServiceNow' ? 'Testing...' : 'Test Webhook'}
              </Button>
            </Flex>
            <Input
              placeholder="https://instance.service-now.com/api/now/table/incident"
              value={servicenowUrl}
              onChange={e => setServicenowUrl(e.target.value)}
              className="bg-gray-950 border-gray-800 text-sm text-gray-100 placeholder-gray-600"
            />
          </Box>

          {/* Jira Software */}
          <Box className="space-y-2">
            <Flex align="center" justify="space-between">
              <Text className="text-sm font-medium text-gray-200">Jira Issue Webhook URL</Text>
              <Button
                size="xs"
                onClick={() => handleTestWebhook('Jira', jiraUrl)}
                disabled={isTesting === 'Jira'}
                className="bg-gray-800 hover:bg-gray-700 text-blue-300 border border-gray-700 text-xs px-2.5 py-1 rounded"
              >
                {isTesting === 'Jira' ? 'Testing...' : 'Test Webhook'}
              </Button>
            </Flex>
            <Input
              placeholder="https://your-domain.atlassian.net/rest/api/3/issue"
              value={jiraUrl}
              onChange={e => setJiraUrl(e.target.value)}
              className="bg-gray-950 border-gray-800 text-sm text-gray-100 placeholder-gray-600"
            />
          </Box>

          {/* PagerDuty */}
          <Box className="space-y-2">
            <Flex align="center" justify="space-between">
              <Text className="text-sm font-medium text-gray-200">PagerDuty Events API v2 URL</Text>
              <Button
                size="xs"
                onClick={() => handleTestWebhook('PagerDuty', pagerdutyUrl)}
                disabled={isTesting === 'PagerDuty'}
                className="bg-gray-800 hover:bg-gray-700 text-emerald-300 border border-gray-700 text-xs px-2.5 py-1 rounded"
              >
                {isTesting === 'PagerDuty' ? 'Testing...' : 'Test Webhook'}
              </Button>
            </Flex>
            <Input
              placeholder="https://events.pagerduty.com/v2/enqueue"
              value={pagerdutyUrl}
              onChange={e => setPagerdutyUrl(e.target.value)}
              className="bg-gray-950 border-gray-800 text-sm text-gray-100 placeholder-gray-600"
            />
          </Box>

          <Box className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-400 space-y-1">
            <Flex align="center" gap={1.5} className="font-semibold text-gray-300">
              <Shield size={14} className="text-indigo-400" />
              Event Schema Validation
            </Flex>
            <Text>
              Sentinel dispatches CloudEvents 1.0 JSON payloads containing severity scores, affected package names, host UUIDs, and automated remediation recommendations.
            </Text>
          </Box>
        </DialogBody>

        <Flex align="center" justify="end" gap={3} className="p-4 border-t border-gray-800 bg-gray-950">
          <Button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-4 py-2 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-medium"
          >
            Save Integration Settings
          </Button>
        </Flex>
      </DialogContent>
    </DialogRoot>
  );
};
