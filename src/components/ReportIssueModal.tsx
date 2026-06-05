import React, { useState } from 'react';
import JSZip from 'jszip';
import { AlertTriangle } from '../utils/icons';

interface ReportIssueModalProps {
  onClose: () => void;
  consoleErrors: string[];
  activeTab: string;
  activeAssessmentId: string | null;
  machineName: string | null;
  osName: string | null;
  findingsCount: number;
  softwareCount: number;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  onClose,
  consoleErrors,
  activeTab,
  activeAssessmentId,
  machineName,
  osName,
  findingsCount,
  softwareCount
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  
  const [step, setStep] = useState(1); // 1: form, 2: success
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('Please fill out the Title and Description.');
      return;
    }

    setLoading(true);

    try {
      // Gather diagnostic details (fully sanitized - no username, paths, cookies, or secrets)
      const appState = {
        ActiveTab: activeTab,
        ActiveAssessmentId: activeAssessmentId || 'N/A',
        ComputerName: machineName || 'N/A',
        OSName: osName || 'N/A',
        FindingsCount: findingsCount,
        SoftwareCount: softwareCount,
        Timestamp: new Date().toISOString(),
        UserAgent: navigator.userAgent,
        Language: navigator.language,
        Platform: navigator.platform
      };

      const issueDetails = {
        Title: title,
        Description: description,
        ExpectedBehavior: expected,
        ActualBehavior: actual,
        AdditionalNotes: notes,
        ScreenshotAttached: screenshot ? screenshot.name : 'None'
      };

      // Generate ZIP using JSZip
      const zip = new JSZip();
      zip.file('Issue.json', JSON.stringify(issueDetails, null, 2));
      zip.file('ApplicationState.json', JSON.stringify(appState, null, 2));
      zip.file('ConsoleErrors.json', JSON.stringify(consoleErrors, null, 2));

      if (screenshot) {
        // Read file as ArrayBuffer and add to zip
        const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(screenshot);
        });
        zip.file(screenshot.name, fileData);
      }

      // Generate zip blob
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Download ZIP file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'EIIP-Diagnostic-Package.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Format Markdown for GitHub issue
      const markdown = `
# EIIP Bug Report: ${title}

## Description
${description}

## Expected Behavior
${expected || 'Not specified'}

## Actual Behavior
${actual || 'Not specified'}

## Additional Notes
${notes || 'None'}

---

## Diagnostic Snapshot
* **Active Tab:** \`${activeTab}\`
* **Assessment ID:** \`${activeAssessmentId || 'N/A'}\`
* **Computer Name:** \`${machineName || 'N/A'}\`
* **OS Name:** \`${osName || 'N/A'}\`
* **Findings Count:** \`${findingsCount}\`
* **Software Count:** \`${softwareCount}\`
* **Screenshot Attached:** \`${screenshot ? screenshot.name : 'No'}\`
* **Errors Logged:** \`${consoleErrors.length} entries (attached in zip package)\`

> [!NOTE]
> Detailed logs and state maps are downloaded in \`EIIP-Diagnostic-Package.zip\`. Please attach the zip file to this issue.
`;

      // Copy markdown to clipboard
      await navigator.clipboard.writeText(markdown.trim());

      setStep(2);
      
      // Open GitHub new issue page
      setTimeout(() => {
        window.open('https://github.com/rjmad1/1_Sentinel/issues/new', '_blank');
      }, 1500);

    } catch (err) {
      alert('Failed to generate diagnostic package: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h3 style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <AlertTriangle size={16} color="var(--color-pink)" />
            <span>Report System Issue</span>
          </h3>
          <button className="cyber-btn" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={onClose}>Close</button>
        </div>

        <div className="modal-body">
          {step === 1 ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5' }}>
                Fill in the details below to report a bug. A sanitized diagnostic package (app state, catalog counts, and console errors) will be generated for download, and a Markdown summary copied to your clipboard.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Issue Title *</label>
                <input 
                  type="text" 
                  className="cyber-input" 
                  placeholder="e.g. Software search regex fails on special characters"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Description *</label>
                <textarea 
                  className="cyber-input" 
                  placeholder="Describe the issue in detail..."
                  required
                  style={{ height: '80px', resize: 'none' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Expected Behavior</label>
                  <textarea 
                    className="cyber-input" 
                    placeholder="What should have happened..."
                    style={{ height: '60px', resize: 'none' }}
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Actual Behavior</label>
                  <textarea 
                    className="cyber-input" 
                    placeholder="What actually happened..."
                    style={{ height: '60px', resize: 'none' }}
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Screenshot / File Attachment</label>
                <input 
                  type="file" 
                  className="cyber-input" 
                  accept="image/*,.txt,.json,.log"
                  style={{ fontSize: '11px', padding: '6px' }}
                  onChange={handleFileChange}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 'bold' }}>Additional Notes</label>
                <textarea 
                  className="cyber-input" 
                  placeholder="Any extra context or system details..."
                  style={{ height: '50px', resize: 'none' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="cyber-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="cyber-btn cyber-btn-primary" style={{ color: '#060913', fontWeight: 'bold' }} disabled={loading}>
                  {loading ? 'Generating Package...' : 'Download Diagnostics & Open GitHub'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                border: '2px solid var(--color-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-green)',
                fontSize: '28px',
                marginBottom: '12px'
              }}>
                ✓
              </div>
              <h4 style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--color-green)' }}>Diagnostic Package Ready</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6', maxWidth: '400px' }}>
                1. <strong>EIIP-Diagnostic-Package.zip</strong> has been downloaded.<br />
                2. Markdown issue template has been copied to your clipboard.<br />
                3. Redirecting you to the GitHub Issues page now...
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                Please paste (Ctrl+V) the Markdown report into the description field on GitHub and upload the downloaded ZIP.
              </p>
              <button className="cyber-btn cyber-btn-primary" style={{ color: '#060913', fontWeight: 'bold', marginTop: '12px', padding: '10px 24px' }} onClick={onClose}>
                Dismiss Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
