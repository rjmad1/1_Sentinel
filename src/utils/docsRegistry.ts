// In-app documentation and help content registry
// This leverages Vite's eager glob loader to ingest local Markdown documents as raw strings.

// Relative path from src/utils/docsRegistry.ts to C:/AIProjects/1_Sentinel/docs is '../../docs/'
const docsGlob = import.meta.glob('../../docs/**/*.md', {
  query: '?raw',
  eager: true
}) as Record<string, { default: string }>;

// Map raw document content by filename (e.g. 'GettingStarted.md')
export const rawDocs: Record<string, string> = {};

Object.entries(docsGlob).forEach(([path, module]) => {
  // Extract filename from path (e.g., '../../docs/FAQ.md' -> 'FAQ.md')
  const filename = path.split('/').pop() || '';
  if (filename) {
    rawDocs[filename] = module.default;
  }
});

// Document interface
export interface DocItem {
  filename: string;
  title: string;
  category: string;
  icon?: string;
}

// Help Content interface
export interface HelpContent {
  title: string;
  purpose: string;
  benefits: string[];
  workflows: string[];
}

// Order and group documents into logical categories
export const docCategories = [
  {
    id: 'onboarding',
    label: 'Onboarding & Overview',
    items: [
      { filename: 'Home.md', title: 'Welcome to Sentinel Wiki', category: 'onboarding' },
      { filename: 'GettingStarted.md', title: 'Getting Started Guide', category: 'onboarding' }
    ]
  },
  {
    id: 'features',
    label: 'Platform Feature Guides',
    items: [
      { filename: 'DashboardGuide.md', title: 'Understanding Your Dashboard', category: 'features' },
      { filename: 'SoftwareIntelligenceGuide.md', title: 'Software Intelligence Catalog', category: 'features' },
      { filename: 'DependencyGraphGuide.md', title: 'Interactive Dependency Graph', category: 'features' },
      { filename: 'AssessmentGuide.md', title: 'System Assessment Reports', category: 'features' }
    ]
  },
  {
    id: 'ai',
    label: 'AI & Diagnostics',
    items: [
      { filename: 'AIReviewPackageGuide.md', title: 'AI Review Package Audits', category: 'ai' }
    ]
  },
  {
    id: 'support',
    label: 'Operations & Troubleshooting',
    items: [
      { filename: 'TroubleshootingGuide.md', title: 'Troubleshooting & Support', category: 'support' },
      { filename: 'PrivacyGuide.md', title: 'Data Privacy & Sovereignty', category: 'support' },
      { filename: 'FAQ.md', title: 'Frequently Asked Questions', category: 'support' }
    ]
  },
  {
    id: 'governance',
    label: 'Development & Governance',
    items: [
      { filename: 'DocumentationGovernanceGuide.md', title: 'Documentation Governance', category: 'governance' },
      { filename: 'ReleaseNotesTemplate.md', title: 'Release Notes Template', category: 'governance' },
      { filename: 'CodeWalkthrough.md', title: 'Source Code Walkthrough', category: 'governance' }
    ]
  }
];

// Helper to extract title from markdown content (first H1 heading)
export function getDocTitle(filename: string): string {
  const content = rawDocs[filename];
  if (!content) return filename;
  
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : filename.replace('.md', '').replace(/([A-Z])/g, ' $1').trim();
}

// Parsed category list populated with actual document titles
export const getDocsList = (): typeof docCategories => {
  return docCategories.map(cat => ({
    ...cat,
    items: cat.items.map(item => ({
      ...item,
      title: getDocTitle(item.filename)
    }))
  }));
};

// Parser for InAppHelpContent.md to dynamically match active tabs
export function getHelpContentForTab(tab: string): HelpContent | null {
  const helpFile = rawDocs['InAppHelpContent.md'];
  if (!helpFile) return null;

  // Map active tabs to section keywords in InAppHelpContent.md
  const tabSectionMap: Record<string, string> = {
    'overview': 'Dashboard Contextual Help',
    'software': 'Software Inventory Contextual Help',
    'topology': 'Graph View Contextual Help',
    'ai': 'AI Review Package Contextual Help',
    'importer': 'Assessment Import Contextual Help'
  };

  const sectionTitle = tabSectionMap[tab];
  if (!sectionTitle) return null;

  // Split content by sections (##)
  const sections = helpFile.split(/^##\s+/m);
  const targetSection = sections.find(sec => sec.includes(sectionTitle));
  
  if (!targetSection) return null;

  const lines = targetSection.split('\n');
  let title = sectionTitle;
  let purpose = '';
  const benefits: string[] = [];
  const workflows: string[] = [];

  let currentMode: 'none' | 'purpose' | 'benefits' | 'workflows' = 'none';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('* **Purpose**') || trimmed.startsWith('**Purpose**')) {
      purpose = trimmed.replace(/^\*?\s*\*\*Purpose\*\*:\s*/, '');
      currentMode = 'none';
    } else if (trimmed.startsWith('* **Benefits**') || trimmed.startsWith('**Benefits**')) {
      currentMode = 'benefits';
    } else if (trimmed.startsWith('* **Common Workflows**') || trimmed.startsWith('**Common Workflows**')) {
      currentMode = 'workflows';
    } else if (currentMode === 'benefits') {
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        benefits.push(trimmed.replace(/^[-*]\s*/, ''));
      } else {
        currentMode = 'none';
      }
    } else if (currentMode === 'workflows') {
      if (trimmed.match(/^\d+\./) || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        workflows.push(trimmed.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, ''));
      } else {
        currentMode = 'none';
      }
    }
  });

  return {
    title,
    purpose: purpose || 'Context-aware documentation summary for this tab.',
    benefits: benefits.length > 0 ? benefits : ['High-fidelity insights', 'Offline accessibility'],
    workflows: workflows.length > 0 ? workflows : ['Inspect page elements', 'Refer to full guide']
  };
}
