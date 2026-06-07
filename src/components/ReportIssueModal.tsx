import React, { useState } from 'react';
import JSZip from 'jszip';
import { AlertTriangle } from '../utils/icons';
import { Box, Flex, Heading, Text, Input, Textarea, SimpleGrid, Button } from '@chakra-ui/react';
import { DialogRoot, DialogContent, DialogHeader, DialogBody, DialogTitle, DialogCloseTrigger } from './ui/dialog';
import { Field } from './ui/field';

interface ReportIssueModalProps {
  onClose: () => void;
  consoleErrors: string[];
  activeTab: string;
  activeAssessmentId: string | null;
  machineName: string | null;
  osName: string | null;
  findingsCount: number;
  softwareCount: number;
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  onClose,
  consoleErrors,
  activeTab,
  activeAssessmentId,
  machineName,
  osName,
  findingsCount,
  softwareCount,
  showToast
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  
  const [titleTouched, setTitleTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const [step, setStep] = useState(1); // 1: form, 2: success
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleTouched(true);
    setDescriptionTouched(true);

    if (!title || !description) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setLoading(true);

    try {
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

      const zip = new JSZip();
      zip.file('Issue.json', JSON.stringify(issueDetails, null, 2));
      zip.file('ApplicationState.json', JSON.stringify(appState, null, 2));
      zip.file('ConsoleErrors.json', JSON.stringify(consoleErrors, null, 2));

      if (screenshot) {
        const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(screenshot);
        });
        zip.file(screenshot.name, fileData);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'EIIP-Diagnostic-Package.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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

      await navigator.clipboard.writeText(markdown.trim());
      showToast('Diagnostic package downloaded and Markdown summary copied to clipboard.', 'success');
      setStep(2);
      
      setTimeout(() => {
        window.open('https://github.com/rjmad1/1_Sentinel/issues/new', '_blank');
      }, 1500);

    } catch (err) {
      showToast('Failed to generate diagnostic package: ' + String(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogRoot open={true} onOpenChange={onClose} size="lg">
      <DialogContent bg="bg.secondary" border="1px solid rgba(255,255,255,0.1)">
        <DialogHeader display="flex" alignContent="center" justifyContent="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" py="4" px="6">
          <DialogTitle id="report-modal-title" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <AlertTriangle size={16} color="#EF4444" />
            <span>Report System Issue</span>
          </DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody p="6">
          {step === 1 ? (
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                <Text color="text.secondary" fontSize="12px" lineHeight="1.5">
                  Fill in the details below to report a bug. A sanitized diagnostic package (app state, catalog counts, and console errors) will be generated for download, and a Markdown summary copied to your clipboard.
                </Text>

                <Field 
                  label="Issue Title *" 
                  invalid={titleTouched && !title} 
                  errorText="Title is required. Please provide a brief title describing the issue."
                >
                  <Input 
                    type="text" 
                    placeholder="e.g. Software search regex fails on special characters"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setTitleTouched(true)}
                    bg="bg.primary"
                    borderColor="rgba(255,255,255,0.15)"
                    _focus={{ borderColor: 'info' }}
                  />
                </Field>

                <Field 
                  label="Description *" 
                  invalid={descriptionTouched && !description} 
                  errorText="Description is required. Please explain what happened."
                >
                  <Textarea 
                    placeholder="Describe the issue in detail..."
                    style={{ height: '80px', resize: 'none' }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => setDescriptionTouched(true)}
                    bg="bg.primary"
                    borderColor="rgba(255,255,255,0.15)"
                    _focus={{ borderColor: 'info' }}
                  />
                </Field>

                <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                  <Field label="Expected Behavior">
                    <Textarea 
                      placeholder="What should have happened..."
                      style={{ height: '60px', resize: 'none' }}
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                      bg="bg.primary"
                      borderColor="rgba(255,255,255,0.15)"
                      _focus={{ borderColor: 'info' }}
                    />
                  </Field>
                  <Field label="Actual Behavior">
                    <Textarea 
                      placeholder="What actually happened..."
                      style={{ height: '60px', resize: 'none' }}
                      value={actual}
                      onChange={(e) => setActual(e.target.value)}
                      bg="bg.primary"
                      borderColor="rgba(255,255,255,0.15)"
                      _focus={{ borderColor: 'info' }}
                    />
                  </Field>
                </SimpleGrid>

                <Field label="Screenshot / File Attachment">
                  <Input 
                    type="file" 
                    accept="image/*,.txt,.json,.log"
                    style={{ fontSize: '11px', padding: '6px' }}
                    onChange={handleFileChange}
                    bg="bg.primary"
                    borderColor="rgba(255,255,255,0.15)"
                    _focus={{ borderColor: 'info' }}
                  />
                </Field>

                <Field label="Additional Notes">
                  <Textarea 
                    placeholder="Any extra context or system details..."
                    style={{ height: '50px', resize: 'none' }}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    bg="bg.primary"
                    borderColor="rgba(255,255,255,0.15)"
                    _focus={{ borderColor: 'info' }}
                  />
                </Field>

                <Flex justify="flex-end" gap="3" mt="2">
                  <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                  <Button type="submit" colorPalette="cyber" size="sm" fontWeight="bold" disabled={loading}>
                    {loading ? 'Generating Package...' : 'Download Diagnostics & Open GitHub'}
                  </Button>
                </Flex>
              </Flex>
            </form>
          ) : (
            <Flex direction="column" gap="4" align="center" textAlign="center" py="5">
              <Box
                w="60px"
                h="60px"
                borderRadius="50%"
                bg="rgba(16,185,129,0.1)"
                border="2px solid #16C784"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="#16C784"
                fontSize="28px"
                mb="3"
              >
                ✓
              </Box>
              <Heading as="h4" fontWeight="bold" fontSize="18px" color="#16C784">Diagnostic Package Ready</Heading>
              <Text color="text.secondary" fontSize="13px" lineHeight="1.6" maxW="400px">
                1. <strong>EIIP-Diagnostic-Package.zip</strong> has been downloaded.<br />
                2. Markdown issue template has been copied to your clipboard.<br />
                3. Redirecting you to the GitHub Issues page now...
              </Text>
              <Text color="text.muted" fontSize="11px" style={{ fontStyle: 'italic' }}>
                Please paste (Ctrl+V) the Markdown report into the description field on GitHub and upload the downloaded ZIP.
              </Text>
              <Button colorPalette="cyber" fontWeight="bold" mt="3" px="6" onClick={onClose}>
                Dismiss Window
              </Button>
            </Flex>
          )}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
