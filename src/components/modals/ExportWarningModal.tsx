import React from 'react';
import { AlertTriangle, Package } from '../../utils/icons';
import { DialogRoot, DialogContent, DialogHeader, DialogBody, DialogTitle } from '../ui/dialog';
import { Button } from '@chakra-ui/react';

interface ExportWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
}

export const ExportWarningModal: React.FC<ExportWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirmExport
}) => {
  if (!isOpen) return null;

  return (
    <DialogRoot open={isOpen} onOpenChange={onClose} size="md">
      <DialogContent bg="bg.secondary" border="1px solid var(--error-500)" boxShadow="0 0 25px rgba(239, 68, 68, 0.15)">
        <DialogHeader display="flex" alignContent="center" justifyContent="space-between" borderBottom="1px solid rgba(239, 68, 68, 0.15)" py="4" px="6">
          <DialogTitle style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--color-pink)' }}>
            <AlertTriangle size={18} />
            Sensitive Data & Privacy Warning
          </DialogTitle>
        </DialogHeader>
        <DialogBody p="6">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <p>
              You are about to export an <strong>AI Diagnostics Review Package</strong> (<code>MachineReviewPackage.zip</code>).
            </p>
            <p>
              This archive contains comprehensive host configuration metadata, including:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>• Complete environment inventory & system name details</li>
              <li>• System health scores, priorities, and technical findings</li>
              <li>• Host software catalog (including potential vulnerabilities)</li>
              <li>• Topology structure graph and dependency relationships</li>
              <li>• Local raw evidence files and custom execution logs</li>
            </ul>
            <p style={{ marginTop: '6px', color: 'var(--text-primary)', fontWeight: 500 }}>
              IMPORTANT SECURITY GUIDANCE:
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
              If you plan to paste these contents or upload this package to third-party Large Language Models (LLMs) or AI assistants for diagnostic analysis, ensure that no sensitive company secrets, hardcoded credentials, API keys, or personally identifiable information (PII) are present.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', borderTop: '1px solid var(--neutral-800)', paddingTop: '16px' }}>
            <Button 
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              colorPalette="red"
              size="sm"
              fontWeight="bold" 
              onClick={() => {
                onClose();
                onConfirmExport();
              }}
            >
              <Package size={14} />
              Acknowledge & Export
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
