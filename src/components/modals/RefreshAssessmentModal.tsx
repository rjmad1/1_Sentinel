import React, { useState, useEffect } from 'react';
import { RefreshCw, Globe } from '../../utils/icons';
import { Box, Flex, Heading, Text, Button, Spinner } from '@chakra-ui/react';
import { DialogRoot, DialogContent, DialogHeader, DialogBody, DialogTitle } from '../ui/dialog';

export interface RefreshAssessmentModalProps {
  onClose: () => void;
  onSuccess: (data: any) => void;
  daemonState: 'connected' | 'disconnected' | 'scanning' | 'error' | 'upgrade-required';
  daemonVersion: string;
  daemonPlatform: string;
  daemonError: string;
  runDaemonScan: () => Promise<void>;
  checkDaemonStatus: () => Promise<void>;
  isTauri?: boolean;
  runTauriScan?: () => Promise<any>;
}

export const RefreshAssessmentModal: React.FC<RefreshAssessmentModalProps> = ({ 
  onClose, 
  onSuccess,
  daemonState,
  daemonVersion,
  daemonPlatform,
  daemonError,
  runDaemonScan,
  checkDaemonStatus,
  isTauri = false,
  runTauriScan
}) => {
  // 0 = Live Scan, 1 = Manual Import, 2 = Finish
  const [step, setStep] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Automatically sync scanning state to step
  useEffect(() => {
    if (daemonState === 'scanning' && step !== 0) {
      setStep(0);
    }
  }, [daemonState, step]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setLoading(true);
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && parsed.Machine) {
          onSuccess(parsed);
          setStep(2);
        } else {
          setUploadError("Invalid Assessment.json schema. The file must contain at least a Machine key.");
        }
      } catch {
        setUploadError("Failed to parse JSON file. Make sure it is a valid JSON document.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerScanAndTransit = () => {
    runDaemonScan().then(() => {
      setStep(2);
    }).catch(() => {
      // error state set by parent
    });
  };

  return (
    <DialogRoot open={true} onOpenChange={onClose} size="lg">
      <DialogContent bg="bg.secondary" border="1px solid rgba(255,255,255,0.1)">
        <DialogHeader display="flex" alignContent="center" justifyContent="space-between" borderBottom="1px solid rgba(255,255,255,0.1)" py="4" px="6">
          <DialogTitle id="refresh-modal-title" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <RefreshCw size={16} className={(step === 1 && loading) || daemonState === 'scanning' ? "spin" : ""} />
            <span>Refresh System Assessment</span>
          </DialogTitle>
          <Button variant="outline" size="xs" onClick={onClose} border="1px solid rgba(255,255,255,0.2)">
            Close
          </Button>
        </DialogHeader>

        <DialogBody p="6">
          {/* Progress Bar */}
          <div className="wizard-steps">
            <div className={`wizard-step ${step === 0 ? 'active' : 'completed'}`}>
              <div className="wizard-step-circle">1</div>
              <div className="wizard-step-label">Live Scan</div>
            </div>
            <div className={`wizard-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="wizard-step-circle">{step > 1 ? "✓" : "2"}</div>
              <div className="wizard-step-label">Manual Import</div>
            </div>
            <div className={`wizard-step ${step === 2 ? 'active' : ''}`}>
              <div className="wizard-step-circle">3</div>
              <div className="wizard-step-label">Finish</div>
            </div>
          </div>

          {/* Step Contents */}
          {step === 0 && (
            <Flex direction="column" gap="4">
              {isTauri ? (
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="2" p="3" bg="rgba(6,182,212,0.05)" border="1px solid rgba(6,182,212,0.2)" borderRadius="6px">
                    <span className="status-indicator pulse" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-cyan)' }}></span>
                    <Text fontSize="13px" fontWeight="bold" color="cyan">
                      Tauri Native Workstation Agent Active
                    </Text>
                  </Flex>
                  <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                    Sentinel is running as a native desktop application. You can trigger an instant, direct scan of this machine without any scripts, daemons, or uploads.
                  </Text>
                  <Button 
                    colorPalette="cyber"
                    onClick={() => {
                      if (runTauriScan) {
                        runTauriScan().then((data) => {
                          if (data) {
                            onSuccess(data);
                            setStep(2);
                          }
                        });
                      }
                    }}
                    fontWeight="bold"
                    py="6"
                    mt="2"
                  >
                    Run Native Workstation Scan
                  </Button>
                </Flex>
              ) : (
                <Flex direction="column" gap="4">
                  {daemonState === 'connected' && (
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2" p="3" bg="rgba(16,185,129,0.05)" border="1px solid rgba(16,185,129,0.2)" borderRadius="6px">
                        <span className="status-indicator pulse" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-green)' }}></span>
                        <Text fontSize="13px" fontWeight="bold" color="success">
                          Local Daemon Connected (v{daemonVersion}) | OS: {daemonPlatform}
                        </Text>
                      </Flex>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                        Sentinel is connected to the endpoint background service. You can trigger a live, zero-friction system diagnostic scan without executing scripts or uploading files.
                      </Text>
                      <Button 
                        colorPalette="cyber"
                        onClick={triggerScanAndTransit}
                        fontWeight="bold"
                        py="6"
                        mt="2"
                      >
                        Run Telemetry Scan
                      </Button>
                      <Flex justify="flex-end" mt="3">
                        <Button variant="outline" size="sm" onClick={() => setStep(1)}>Manual Legacy Upload</Button>
                      </Flex>
                    </Flex>
                  )}

                  {daemonState === 'scanning' && (
                    <Flex direction="column" gap="4" align="center" textAlign="center" py="5">
                      <Spinner size="xl" color="cyan" />
                      <Heading as="h4" fontWeight="bold" fontSize="16px" color="cyan">Harvesting Live Telemetry</Heading>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6" maxW="400px">
                        Querying local system instrumentation metrics, CPU loads, storage limits, and active software registries. Please stand by...
                      </Text>
                    </Flex>
                  )}

                  {daemonState === 'upgrade-required' && (
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2" p="3" bg="rgba(245,158,11,0.05)" border="1px solid rgba(245,158,11,0.2)" borderRadius="6px">
                        <span className="status-indicator pulse" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-orange)' }}></span>
                        <Text fontSize="13px" fontWeight="bold" color="orange">
                          Daemon Upgrade Required (v{daemonVersion})
                        </Text>
                      </Flex>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                        The daemon running on your host is outdated. Version v1.0.0 or higher is required to support the V1 live scanning framework.
                      </Text>
                      <Flex justify="space-between" mt="3">
                        <Button variant="outline" size="sm" onClick={checkDaemonStatus}>Retry Connection</Button>
                        <Button variant="outline" size="sm" onClick={() => setStep(1)}>Manual Legacy Upload</Button>
                      </Flex>
                    </Flex>
                  )}

                  {daemonState === 'error' && (
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2" p="3" bg="rgba(239,68,68,0.05)" border="1px solid rgba(239,68,68,0.2)" borderRadius="6px">
                        <span className="status-indicator" style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-pink)' }}></span>
                        <Text fontSize="13px" fontWeight="bold" color="danger">
                          Daemon Error: {daemonError || 'Permission Denied'}
                        </Text>
                      </Flex>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                        The background daemon reported an issue or lacked administrator permissions to query system hardware components.
                      </Text>
                      <Flex gap="3" mt="2">
                        <Button 
                          colorPalette="cyber" 
                          flex="1"
                          fontWeight="bold"
                          py="6"
                          onClick={triggerScanAndTransit}
                        >
                          Retry Live Scan
                        </Button>
                        <Button 
                          variant="outline" 
                          flex="1" 
                          py="6"
                          onClick={checkDaemonStatus}
                        >
                          Reconnect Daemon
                        </Button>
                      </Flex>
                      <Flex justify="flex-end" mt="3">
                        <Button variant="outline" size="sm" onClick={() => setStep(1)}>Manual Legacy Upload</Button>
                      </Flex>
                    </Flex>
                  )}

                  {daemonState === 'disconnected' && (
                    <Flex direction="column" gap="3">
                      <Flex align="center" gap="2" p="3" bg="rgba(255,255,255,0.05)" border="1px solid rgba(255,255,255,0.1)" borderRadius="6px">
                        <span className="status-indicator" style={{ width: '10px', height: '10px', backgroundColor: 'var(--text-muted)' }}></span>
                        <Text fontSize="13px" fontWeight="bold" color="text.secondary">
                          Sentinel Local Collector Offline
                        </Text>
                      </Flex>
                      <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                        To unlock live assessments, please start the background daemon on your local endpoint.
                      </Text>
                      
                      <Flex direction="column" gap="3" mt="2">
                        <Flex gap="3">
                          <Button 
                            variant="outline" 
                            flex="1" 
                            onClick={checkDaemonStatus}
                          >
                            Retry Connection
                          </Button>
                          <Button 
                            variant="outline" 
                            flex="1" 
                            onClick={() => setStep(1)}
                          >
                            Manual Legacy Upload
                          </Button>
                        </Flex>
                      </Flex>
                    </Flex>
                  )}
                </Flex>
              )}
            </Flex>
          )}

          {step === 1 && (
            <Flex direction="column" gap="4">
              <Heading as="h4" fontWeight="bold" fontSize="14px" textTransform="uppercase" color="cyan">Import Assessment.json Report</Heading>
              <Text color="text.secondary" fontSize="13px" lineHeight="1.6">
                Select or drag-and-drop your system assessment report JSON file below to refresh the system dashboard state.
              </Text>

              <Box 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                border={dragActive ? '2px dashed #06B6D4' : '2px dashed rgba(255,255,255,0.15)'}
                borderRadius="8px"
                py="10"
                px="5"
                textAlign="center"
                bg={dragActive ? 'rgba(6,182,212,0.03)' : 'rgba(255,255,255,0.01)'}
                cursor="pointer"
                position="relative"
              >
                <input 
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer'
                  }}
                />
                <Globe size={32} color={dragActive ? "var(--color-cyan)" : "var(--text-muted)"} style={{ marginBottom: '12px', display: 'inline-block' }} />
                <Text fontSize="14px" fontWeight="bold">
                  {loading ? "Parsing assessment..." : "Drag & Drop Assessment.json here"}
                </Text>
                <Text fontSize="11px" color="text.muted" mt="1">
                  or click to select file from disk
                </Text>
              </Box>

              {uploadError && (
                <Box color="danger" fontSize="12px" bg="rgba(239,68,68,0.05)" border="1px solid rgba(239,68,68,0.15)" p="3" borderRadius="6px">
                  {uploadError}
                </Box>
              )}

              <Flex justify="space-between" mt="3">
                <Button variant="outline" size="sm" onClick={() => setStep(0)}>Back to Live Mode</Button>
              </Flex>
            </Flex>
          )}

          {step === 2 && (
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
              <Heading as="h4" fontWeight="bold" fontSize="18px" color="success">Assessment Refreshed Successfully</Heading>
              <Text color="text.secondary" fontSize="13px" lineHeight="1.6" maxW="400px">
                All views, dependency graphs, findings tables, and status meters have been refreshed with the latest telemetry.
              </Text>
              <Button colorPalette="cyber" fontWeight="bold" mt="3" px="6" onClick={onClose}>
                Finish & View Dashboard
              </Button>
            </Flex>
          )}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};
