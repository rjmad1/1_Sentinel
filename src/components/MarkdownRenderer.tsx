import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Code,
  Flex,
  Table,
  Button,
  Image,
  VStack
} from '@chakra-ui/react';
import {
  AlertTriangle,
  ExternalLink,
  Check
} from '../utils/icons';

// Define custom inline icons to keep the component lightweight and self-contained
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

interface MarkdownRendererProps {
  content: string;
  onNavigateToDoc?: (filename: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onNavigateToDoc,
  onNavigateToTab
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Helper to parse inline styles (bold, italics, inline code, external/internal links)
  const renderInlineStyles = (text: string) => {
    let currentText = text;

    // RegEx patterns
    // Bold: **text**
    // Italic: *text*
    // Code: `code`
    // Links: [label](url)
    
    // We will do a sequential regex replacement using a simplified tokenization
    const tokens: Array<{ type: 'text' | 'bold' | 'italic' | 'code' | 'link'; content: string; url?: string }> = [];
    
    while (currentText.length > 0) {
      const boldMatch = currentText.match(/^\*\*(.*?)\*\*/);
      const italicMatch = currentText.match(/^\*(.*?)\*/);
      const codeMatch = currentText.match(/^`(.*?)`/);
      const linkMatch = currentText.match(/^\[(.*?)\]\((.*?)\)/);

      if (boldMatch) {
        tokens.push({ type: 'bold', content: boldMatch[1] });
        currentText = currentText.substring(boldMatch[0].length);
      } else if (italicMatch) {
        tokens.push({ type: 'italic', content: italicMatch[1] });
        currentText = currentText.substring(italicMatch[0].length);
      } else if (codeMatch) {
        tokens.push({ type: 'code', content: codeMatch[1] });
        currentText = currentText.substring(codeMatch[0].length);
      } else if (linkMatch) {
        tokens.push({ type: 'link', content: linkMatch[1], url: linkMatch[2] });
        currentText = currentText.substring(linkMatch[0].length);
      } else {
        // Find the next match index
        const nextMatches = [
          currentText.indexOf('**'),
          currentText.indexOf('*'),
          currentText.indexOf('`'),
          currentText.indexOf('[')
        ].filter(idx => idx !== -1);

        const nextMatchIdx = nextMatches.length > 0 ? Math.min(...nextMatches) : currentText.length;
        
        tokens.push({ type: 'text', content: currentText.substring(0, nextMatchIdx) });
        currentText = currentText.substring(nextMatchIdx);
      }
    }

    return tokens.map((token, idx) => {
      switch (token.type) {
        case 'bold':
          return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{token.content}</strong>;
        case 'italic':
          return <em key={idx} style={{ fontStyle: 'italic' }}>{token.content}</em>;
        case 'code':
          return (
            <Code
              key={idx}
              px="1.5"
              py="0.5"
              borderRadius="4px"
              bg="rgba(6,182,212,0.1)"
              color="cyan"
              fontSize="12px"
              fontFamily="mono"
              border="1px solid rgba(6,182,212,0.15)"
            >
              {token.content}
            </Code>
          );
        case 'link': {
          const url = token.url || '';
          const isDocLink = url.endsWith('.md');
          const isTabLink = url.startsWith('tab:');
          
          if (isDocLink) {
            return (
              <a
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigateToDoc) onNavigateToDoc(url);
                }}
                style={{
                  color: 'var(--color-cyan)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {token.content}
              </a>
            );
          } else if (isTabLink) {
            const targetTab = url.replace('tab:', '');
            return (
              <a
                key={idx}
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigateToTab) onNavigateToTab(targetTab);
                }}
                style={{
                  color: 'var(--color-cyan)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {token.content}
              </a>
            );
          } else {
            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-cyan)',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: '500'
                }}
              >
                {token.content} <ExternalLink size={10} />
              </a>
            );
          }
        }
        default:
          return <span key={idx}>{token.content}</span>;
      }
    });
  };

  // Block parsing logic
  const parseBlocks = () => {
    const lines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    
    let currentCodeLines: string[] = [];
    let currentCodeLanguage = '';
    let currentTableLines: string[] = [];
    let currentListItems: { text: string; type: 'ul' | 'ol' }[] = [];
    let currentQuoteLines: string[] = [];
    
    let isCode = false;
    let isTable = false;
    let isList = false;
    let isQuote = false;

    const flushCode = (idx: number) => {
      const codeText = currentCodeLines.join('\n');
      const codeId = `code-block-${idx}`;
      const isCopied = copiedCodeId === codeId;
      
      blocks.push(
        <Box
          key={`code-${idx}`}
          my="4"
          bg="rgba(11,15,20,0.9)"
          borderRadius="8px"
          border="1px solid rgba(255,255,255,0.08)"
          overflow="hidden"
          boxShadow="0 4px 20px rgba(0,0,0,0.3)"
        >
          {/* Code block header */}
          <Flex
            bg="rgba(255,255,255,0.03)"
            px="4"
            py="2"
            align="center"
            justify="space-between"
            borderBottom="1px solid rgba(255,255,255,0.05)"
          >
            <Text fontSize="11px" fontFamily="mono" color="text.muted" textTransform="uppercase" letterSpacing="0.5px">
              {currentCodeLanguage || 'code'}
            </Text>
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleCopyCode(codeText, codeId)}
              borderColor="rgba(255,255,255,0.15)"
              _hover={{ bg: 'rgba(255,255,255,0.05)' }}
              h="24px"
              fontSize="10px"
              display="flex"
              alignItems="center"
              gap="1"
            >
              {isCopied ? <Check size={10} color="#16C784" /> : <CopyIcon />}
              <Text as="span">{isCopied ? 'Copied' : 'Copy'}</Text>
            </Button>
          </Flex>

          <Code
            display="block"
            p="4"
            bg="transparent"
            color="info"
            fontSize="12.5px"
            fontFamily="mono"
            whiteSpace="pre"
            overflowX="auto"
            lineHeight="1.5"
          >
            {codeText}
          </Code>
        </Box>
      );
      currentCodeLines = [];
      currentCodeLanguage = '';
      isCode = false;
    };

    const flushTable = (idx: number) => {
      if (currentTableLines.length === 0) return;
      
      // Parse markdown table
      const rows = currentTableLines.map(line =>
        line.split('|').map(cell => cell.trim()).filter((_, colIdx, arr) => colIdx > 0 && colIdx < arr.length - 1)
      );

      // Extract headers and data rows
      const headerRow = rows[0];
      // Skip the separator row (e.g. |---|---|)
      const dataRows = rows.slice(2);

      blocks.push(
        <Box key={`table-${idx}`} my="5" overflowX="auto" className="glass-panel" p="2" borderRadius="8px" border="1px solid rgba(255,255,255,0.1)">
          <Table.Root size="sm" variant="line" bg="bg.card">
            <Table.Header borderBottom="2px solid rgba(6,182,212,0.3)">
              <Table.Row>
                {headerRow.map((cell, cellIdx) => (
                  <Table.ColumnHeader
                    key={cellIdx}
                    py="3"
                    px="4"
                    fontSize="11px"
                    fontWeight="bold"
                    color="cyan"
                    textTransform="uppercase"
                    letterSpacing="0.5px"
                    bg="rgba(6,182,212,0.02)"
                    borderBottom="1px solid rgba(255,255,255,0.08)"
                  >
                    {cell}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {dataRows.map((row, rowIdx) => (
                <Table.Row
                  key={rowIdx}
                  _hover={{ bg: 'rgba(255,255,255,0.02)' }}
                  bg={rowIdx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}
                >
                  {row.map((cell, cellIdx) => (
                    <Table.Cell
                      key={cellIdx}
                      py="2.5"
                      px="4"
                      fontSize="12.5px"
                      color="text.secondary"
                      borderBottom="1px solid rgba(255,255,255,0.05)"
                      fontFamily={cellIdx === 0 && (cell.startsWith('Q') || cell.match(/^\d/)) ? 'mono' : 'inherit'}
                    >
                      {renderInlineStyles(cell)}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      );
      
      currentTableLines = [];
      isTable = false;
    };

    const flushList = (idx: number) => {
      if (currentListItems.length === 0) return;
      
      const isOl = currentListItems[0].type === 'ol';
      const wrapperStyle = {
        paddingLeft: '24px',
        marginTop: '8px',
        marginBottom: '12px',
        listStyleType: isOl ? 'decimal' : 'disc',
      };

      blocks.push(
        isOl ? (
          <ol key={`list-${idx}`} style={wrapperStyle}>
            {currentListItems.map((item, itemIdx) => (
              <li key={itemIdx} style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: '1.5' }}>
                {renderInlineStyles(item.text)}
              </li>
            ))}
          </ol>
        ) : (
          <ul key={`list-${idx}`} style={wrapperStyle}>
            {currentListItems.map((item, itemIdx) => (
              <li key={itemIdx} style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: '1.5' }}>
                {renderInlineStyles(item.text)}
              </li>
            ))}
          </ul>
        )
      );

      currentListItems = [];
      isList = false;
    };

    const flushQuote = (idx: number) => {
      if (currentQuoteLines.length === 0) return;

      const fullQuote = currentQuoteLines.join('\n');
      
      // Detect GitHub style alerts: [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
      const alertMatch = fullQuote.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*)$/i);
      
      if (alertMatch) {
        const type = alertMatch[1].toUpperCase();
        const alertContent = alertMatch[2].trim();

        let borderLeftColor = '#06B6D4'; // NOTE (Cyan)
        let alertBg = 'rgba(6,182,212,0.03)';
        let titleColor = 'cyan';
        let alertIcon = <InfoIcon />;

        if (type === 'TIP') {
          borderLeftColor = '#16C784'; // Green
          alertBg = 'rgba(22,199,132,0.03)';
          titleColor = 'success';
          alertIcon = <CheckCircleIcon />;
        } else if (type === 'IMPORTANT' || type === 'WARNING') {
          borderLeftColor = '#F5A524'; // Orange
          alertBg = 'rgba(245,165,36,0.03)';
          titleColor = 'orange';
          alertIcon = <AlertTriangle size={14} color="var(--color-orange)" />;
        } else if (type === 'CAUTION') {
          borderLeftColor = '#EF4444'; // Red
          alertBg = 'rgba(239,68,68,0.03)';
          titleColor = 'danger';
          alertIcon = <AlertTriangle size={14} color="var(--color-pink)" />;
        }

        blocks.push(
          <Box
            key={`alert-${idx}`}
            my="4"
            p="4"
            bg={alertBg}
            borderLeft="4px solid"
            borderLeftColor={borderLeftColor}
            borderRadius="0 8px 8px 0"
            border="1px solid rgba(255,255,255,0.03)"
            borderLeftWidth="4px"
          >
            <Flex align="center" gap="2" mb="1.5" fontWeight="bold" fontSize="12px" color={titleColor}>
              {alertIcon}
              <Text as="span" textTransform="uppercase" letterSpacing="0.5px">
                {type}
              </Text>
            </Flex>
            <Text fontSize="13px" color="text.secondary" lineHeight="1.5">
              {renderInlineStyles(alertContent)}
            </Text>
          </Box>
        );
      } else {
        // Standard Blockquote
        blocks.push(
          <Box
            key={`quote-${idx}`}
            my="4"
            pl="4"
            borderLeft="3px solid rgba(255,255,255,0.2)"
            color="text.muted"
            fontStyle="italic"
            fontSize="13px"
            lineHeight="1.5"
          >
            {renderInlineStyles(fullQuote)}
          </Box>
        );
      }

      currentQuoteLines = [];
      isQuote = false;
    };

    const flushAll = (idx: number) => {
      if (isCode) flushCode(idx);
      if (isTable) flushTable(idx);
      if (isList) flushList(idx);
      if (isQuote) flushQuote(idx);
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Code block detection
      if (trimmed.startsWith('```')) {
        if (isCode) {
          flushCode(i);
        } else {
          flushAll(i);
          isCode = true;
          currentCodeLanguage = trimmed.replace('```', '').trim();
        }
        continue;
      }

      if (isCode) {
        currentCodeLines.push(line);
        continue;
      }

      // 2. Table detection
      if (trimmed.startsWith('|')) {
        if (!isTable) {
          flushAll(i);
          isTable = true;
        }
        currentTableLines.push(line);
        continue;
      } else if (isTable) {
        flushTable(i);
      }

      // 3. Blockquote detection
      if (trimmed.startsWith('>')) {
        if (!isQuote) {
          flushAll(i);
          isQuote = true;
        }
        currentQuoteLines.push(trimmed.substring(1).trim());
        continue;
      } else if (isQuote) {
        flushQuote(i);
      }

      // 4. List detection (unordered and ordered)
      const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
      const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);

      if (ulMatch) {
        if (!isList) {
          flushAll(i);
          isList = true;
        }
        currentListItems.push({ text: ulMatch[2], type: 'ul' });
        continue;
      } else if (olMatch) {
        if (!isList) {
          flushAll(i);
          isList = true;
        }
        currentListItems.push({ text: olMatch[2], type: 'ol' });
        continue;
      } else if (isList) {
        flushList(i);
      }

      // 5. Header tags (# to ######)
      const h1Match = line.match(/^#\s+(.+)$/);
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);
      const h4Match = line.match(/^####\s+(.+)$/);
      const h5Match = line.match(/^#####\s+(.+)$/);
      const h6Match = line.match(/^######\s+(.+)$/);

      if (h1Match) {
        flushAll(i);
        blocks.push(
          <Heading
            key={i}
            as="h1"
            fontSize="26px"
            fontWeight="bold"
            color="text.primary"
            my="5"
            borderBottom="1px solid rgba(255,255,255,0.1)"
            pb="3"
            style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
          >
            {h1Match[1]}
          </Heading>
        );
        continue;
      }

      if (h2Match) {
        flushAll(i);
        blocks.push(
          <Heading
            key={i}
            as="h2"
            fontSize="18px"
            fontWeight="bold"
            color="cyan"
            mt="6"
            mb="3"
            style={{ letterSpacing: '0.5px' }}
          >
            {h2Match[1]}
          </Heading>
        );
        continue;
      }

      if (h3Match) {
        flushAll(i);
        blocks.push(
          <Heading
            key={i}
            as="h3"
            fontSize="15px"
            fontWeight="bold"
            color="text.primary"
            mt="4"
            mb="2.5"
          >
            {h3Match[1]}
          </Heading>
        );
        continue;
      }

      if (h4Match || h5Match || h6Match) {
        const textVal = (h4Match || h5Match || h6Match)![1];
        flushAll(i);
        blocks.push(
          <Heading
            key={i}
            as="h4"
            fontSize="13.5px"
            fontWeight="bold"
            color="text.secondary"
            mt="3"
            mb="2"
          >
            {textVal}
          </Heading>
        );
        continue;
      }

      // 6. Horizontal rules
      if (trimmed === '---' || trimmed === '***') {
        flushAll(i);
        blocks.push(
          <Box
            key={i}
            my="6"
            height="1px"
            bg="rgba(255, 255, 255, 0.08)"
            w="full"
          />
        );
        continue;
      }

      // 7. Images / Screenshots
      // e.g. `![Caption](docs/images/filename.png)`
      const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        flushAll(i);
        const caption = imgMatch[1];
        const path = imgMatch[2];
        
        // Map relative path for static build (Vite serves docs/images in public or relative path)
        // If the path starts with docs/, we can prepend / to resolve absolute or handle relative
        let resolvedPath = path;
        if (path.startsWith('docs/')) {
          resolvedPath = '/' + path; // absolute public mapping
        }

        blocks.push(
          <VStack key={i} my="5" align="center" gap="2">
            <Image
              src={resolvedPath}
              alt={caption}
              borderRadius="8px"
              border="1px solid rgba(255,255,255,0.12)"
              boxShadow="0 4px 16px rgba(0,0,0,0.2)"
              maxH="380px"
              objectFit="contain"
            />
            {caption && (
              <Text fontSize="11px" color="text.muted" fontStyle="italic">
                {caption}
              </Text>
            )}
          </VStack>
        );
        continue;
      }

      // 8. Plain Paragraph Text
      if (trimmed) {
        flushAll(i);
        blocks.push(
          <Text
            key={i}
            fontSize="13.5px"
            color="text.secondary"
            lineHeight="1.6"
            mb="3"
          >
            {renderInlineStyles(line)}
          </Text>
        );
      }
    }

    // Flush any leftover open blocks
    flushAll(lines.length);

    return blocks;
  };

  return <Box className="markdown-body">{parseBlocks()}</Box>;
};
