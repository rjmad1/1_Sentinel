export interface SoftwareInstance {
  Id: string;
  Source: 'Winget' | 'Chocolatey' | 'Scoop' | 'Store' | 'MSI' | 'Portable' | 'Manual' | 'WSL' | 'Docker' | 'Registry' | 'Python' | 'Node';
  InstalledVersion: string;
  Scope: 'Current User' | 'All Users' | 'Machine-Wide' | 'System Component';
  InstallPath: string;
  InstallDate: string;
  Size: string;
  Architecture: 'x64' | 'x86' | 'arm64' | 'n/a';
  DetailValue?: string;
}

export interface PackageDependency {
  Name: string;
  Relation: 'Depends On' | 'Required By' | 'Related To';
  PackageName: string;
}

export interface VulnerabilityInfo {
  CveId: string;
  Cvss: number;
  Severity: 'Critical' | 'High' | 'Medium' | 'Low';
  Description: string;
  AdvisoryUrl: string;
}

export interface UpgradePlanInfo {
  Plan: string[];
  Risks: string[];
  Rollback: string[];
  Validation: string[];
  Category: 'Fully Automated' | 'Semi-Automated' | 'Manual';
}

export interface UninstallPlanInfo {
  Plan: string[];
  Risks: string[];
  Rollback: string[];
  Validation: string[];
  Method: 'Silent Uninstall' | 'Package Manager Removal' | 'MSI Removal' | 'Manual Removal';
}

export interface NormalizedPackage {
  Name: string;
  Publisher: string;
  Vendor: string;
  Category: string;
  Technology: string;
  Description: string;
  Tags: string[];
  LatestVersion: string;
  ReleaseDate: string;
  SupportStatus: 'Active' | 'Active LTS' | 'Deprecated' | 'End-of-Life';
  EOLDate: string;
  UpdateState: 'Up-To-Date' | 'Update Available' | 'Unsupported' | 'Deprecated' | 'End-of-Life';
  SecurityRisk: 'Critical' | 'High' | 'Medium' | 'None';
  Scope: 'Current User' | 'All Users' | 'Machine-Wide' | 'System Component';
  Instances: SoftwareInstance[];
  Dependencies: PackageDependency[];
  Vulnerabilities: VulnerabilityInfo[];
  UpgradePlan: UpgradePlanInfo;
  UninstallPlan: UninstallPlanInfo;
}

export const MOCK_SOFTWARE_CATALOG: NormalizedPackage[] = [
  {
    Name: 'Python',
    Publisher: 'Python Software Foundation',
    Vendor: 'Python.org',
    Category: 'Development Tooling',
    Technology: 'Runtime Environment',
    Description: 'Python is an interpreted, high-level, general-purpose programming language. Its design philosophy emphasizes code readability.',
    Tags: ['programming', 'development', 'scripting', 'ai'],
    LatestVersion: '3.13.0',
    ReleaseDate: '2024-10-07',
    SupportStatus: 'Active',
    EOLDate: '2029-10-31',
    UpdateState: 'Update Available',
    SecurityRisk: 'Medium',
    Scope: 'Machine-Wide',
    Instances: [
      {
        Id: 'inst-py-1',
        Source: 'Winget',
        InstalledVersion: '3.11.4',
        Scope: 'Machine-Wide',
        InstallPath: 'C:\\Program Files\\Python311',
        InstallDate: '2025-02-15',
        Size: '95 MB',
        Architecture: 'x64'
      },
      {
        Id: 'inst-py-2',
        Source: 'WSL',
        InstalledVersion: '3.10.12',
        Scope: 'System Component',
        InstallPath: '/usr/bin/python3',
        InstallDate: '2024-11-10',
        Size: '82 MB',
        Architecture: 'x64',
        DetailValue: 'Ubuntu 22.04 default package'
      },
      {
        Id: 'inst-py-3',
        Source: 'Docker',
        InstalledVersion: '3.12.0',
        Scope: 'Current User',
        InstallPath: 'Image: python:3.12-alpine',
        InstallDate: '2026-01-20',
        Size: '45 MB',
        Architecture: 'x64'
      }
    ],
    Dependencies: [
      { Name: 'Poetry', Relation: 'Required By', PackageName: 'Poetry' },
      { Name: 'JupyterLab', Relation: 'Required By', PackageName: 'JupyterLab' }
    ],
    Vulnerabilities: [
      {
        CveId: 'CVE-2023-27043',
        Cvss: 7.5,
        Severity: 'High',
        Description: 'Python email module parses email addresses incorrectly, leading to possible spoofing or validation bypass.',
        AdvisoryUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2023-27043'
      }
    ],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Run winget upgrade --id Python.Python -v 3.13.0 --silent',
        'Update Python dependencies in WSL Ubuntu via apt-get install python3',
        'Rebuild Dockerfiles pulling python:3.13-alpine base image'
      ],
      Risks: [
        'Python 3.13 deprecates several legacy modules (e.g. distutils), which may break local Poetry or older packages.',
        'Minor syntax revisions in default library parsers.'
      ],
      Rollback: [
        'Winget rollback requires manual uninstallation of 3.13 and reinstallation of 3.11.',
        'Revert docker container tag back to python:3.12-alpine.'
      ],
      Validation: [
        'Run: python --version (Expected: 3.13.x)',
        'Verify pip installer availability: pip --version'
      ]
    },
    UninstallPlan: {
      Method: 'Silent Uninstall',
      Plan: [
        'Verify dependents: Poetry and JupyterLab will be disabled.',
        'Run winget uninstall --id Python.Python'
      ],
      Risks: [
        'Critical Risk: Removing Python breaks all active local Python tooling (Poetry, JupyterLab, AI scripts).',
        'May disable local development server workflows.'
      ],
      Rollback: [
        'Re-install Python 3.11 via Winget.'
      ],
      Validation: [
        'Run python --version. Command should not be found.'
      ]
    }
  },
  {
    Name: 'Node.js',
    Publisher: 'OpenJS Foundation',
    Vendor: 'Nodejs.org',
    Category: 'Development Tooling',
    Technology: 'JavaScript Runtime',
    Description: 'Node.js is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser.',
    Tags: ['javascript', 'development', 'backend', 'web'],
    LatestVersion: '22.2.0',
    ReleaseDate: '2024-05-14',
    SupportStatus: 'Active LTS',
    EOLDate: '2027-04-30',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Machine-Wide',
    Instances: [
      {
        Id: 'inst-node-1',
        Source: 'Winget',
        InstalledVersion: '20.5.0',
        Scope: 'Machine-Wide',
        InstallPath: 'C:\\Program Files\\nodejs',
        InstallDate: '2025-06-01',
        Size: '120 MB',
        Architecture: 'x64'
      },
      {
        Id: 'inst-node-2',
        Source: 'WSL',
        InstalledVersion: '18.16.0',
        Scope: 'System Component',
        InstallPath: '/usr/bin/node',
        InstallDate: '2024-08-15',
        Size: '95 MB',
        Architecture: 'x64',
        DetailValue: 'Ubuntu 22.04 default node binary'
      }
    ],
    Dependencies: [
      { Name: 'React', Relation: 'Required By', PackageName: 'React' },
      { Name: 'Express', Relation: 'Required By', PackageName: 'Express' }
    ],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Execute: winget upgrade --id OpenJS.NodeJS -v 22.2.0 --silent',
        'WSL node upgrade via NodeSource PPA'
      ],
      Risks: [
        'WSL Node v18 is EOL. Node v22 has minor updates in V8 engine but is highly backward compatible.',
        'Local npm global packages might need a rebuild (npm rebuild -g).'
      ],
      Rollback: [
        'Download Node v20 MSI installer from nodejs.org, execute, and overwrite v22.',
        'Downgrade WSL node source PPA.'
      ],
      Validation: [
        'Run: node -v (Expected v22.2.0)',
        'Verify npm command: npm -v'
      ]
    },
    UninstallPlan: {
      Method: 'Package Manager Removal',
      Plan: [
        'Uninstall global node package registries.',
        'Run winget uninstall --id OpenJS.NodeJS'
      ],
      Risks: [
        'Removes React build script operations and Express mock servers from local machine.',
        'Breaks Node.js CLI commands.'
      ],
      Rollback: [
        'Run winget install OpenJS.NodeJS.'
      ],
      Validation: [
        'Verify node -v fails to execute.'
      ]
    }
  },
  {
    Name: 'Git',
    Publisher: 'Software Freedom Conservancy',
    Vendor: 'Git-SCM',
    Category: 'Development Tooling',
    Technology: 'Version Control',
    Description: 'Git is a free and open source distributed version control system designed to handle everything from small to very large projects with speed and efficiency.',
    Tags: ['version-control', 'git', 'development'],
    LatestVersion: '2.43.0',
    ReleaseDate: '2023-11-20',
    SupportStatus: 'Active',
    EOLDate: '2030-01-01',
    UpdateState: 'Update Available',
    SecurityRisk: 'High',
    Scope: 'Machine-Wide',
    Instances: [
      {
        Id: 'inst-git-1',
        Source: 'Winget',
        InstalledVersion: '2.41.0',
        Scope: 'Machine-Wide',
        InstallPath: 'C:\\Program Files\\Git\\bin\\git.exe',
        InstallDate: '2025-01-10',
        Size: '110 MB',
        Architecture: 'x64'
      },
      {
        Id: 'inst-git-2',
        Source: 'Scoop',
        InstalledVersion: '2.41.0',
        Scope: 'Current User',
        InstallPath: 'C:\\Users\\rajaj\\scoop\\apps\\git\\current\\cmd\\git.exe',
        InstallDate: '2025-03-05',
        Size: '105 MB',
        Architecture: 'x64'
      },
      {
        Id: 'inst-git-3',
        Source: 'WSL',
        InstalledVersion: '2.39.1',
        Scope: 'System Component',
        InstallPath: '/usr/bin/git',
        InstallDate: '2024-05-18',
        Size: '88 MB',
        Architecture: 'x64'
      }
    ],
    Dependencies: [],
    Vulnerabilities: [
      {
        CveId: 'CVE-2023-29007',
        Cvss: 8.8,
        Severity: 'High',
        Description: 'Path injection vulnerability in git config system allows local configuration overrides via maliciously crafted repositories.',
        AdvisoryUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2023-29007'
      }
    ],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Run: winget upgrade --id Git.Git -v 2.43.0 --silent',
        'Scoop update: scoop update git',
        'WSL update: sudo apt-get install git'
      ],
      Risks: [
        'None identified. This is a critical security upgrade with no breaking behaviors.'
      ],
      Rollback: [
        'Reinstall 2.41.0 MSI manually.'
      ],
      Validation: [
        'Run: git --version (Expected v2.43.0 or higher)'
      ]
    },
    UninstallPlan: {
      Method: 'MSI Removal',
      Plan: [
        'Run winget uninstall --id Git.Git',
        'Remove local git config settings from %USERPROFILE%\\.gitconfig'
      ],
      Risks: [
        'Breaks all CI/CD operations, code checkouts, VS Code Git integrations, and pull/push workflows.'
      ],
      Rollback: [
        'Re-install Git using Scoop or Winget.'
      ],
      Validation: [
        'Run git --version. Command should fail.'
      ]
    }
  },
  {
    Name: 'Docker Desktop',
    Publisher: 'Docker Inc.',
    Vendor: 'Docker',
    Category: 'Containers',
    Technology: 'Container Engine',
    Description: 'Docker Desktop is an easy-to-install application that enables you to build and share containerized applications and microservices.',
    Tags: ['docker', 'containers', 'virtualization'],
    LatestVersion: '4.25.0',
    ReleaseDate: '2023-10-25',
    SupportStatus: 'Active',
    EOLDate: '2028-12-31',
    UpdateState: 'Update Available',
    SecurityRisk: 'High',
    Scope: 'Machine-Wide',
    Instances: [
      {
        Id: 'inst-dock-1',
        Source: 'Winget',
        InstalledVersion: '4.19.0',
        Scope: 'Machine-Wide',
        InstallPath: 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
        InstallDate: '2024-09-18',
        Size: '1.2 GB',
        Architecture: 'x64'
      }
    ],
    Dependencies: [
      { Name: 'Postgres', Relation: 'Required By', PackageName: 'Postgres' }
    ],
    Vulnerabilities: [
      {
        CveId: 'CVE-2023-3899',
        Cvss: 7.2,
        Severity: 'High',
        Description: 'Privilege escalation vulnerability in Docker Desktop helper service on Windows.',
        AdvisoryUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2023-3899'
      }
    ],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Verify WSL integration state.',
        'Run: winget upgrade --id Docker.DockerDesktop -v 4.25.0'
      ],
      Risks: [
        'Docker Daemon restart required. All running containers will be terminated temporarily.',
        'May require VM configuration update in Hyper-V/WSL.'
      ],
      Rollback: [
        'Reinstall 4.19.0. May lose local volume mappings if files are cached.'
      ],
      Validation: [
        'Run: docker version (Verify Engine & Desktop version is 4.25.0)',
        'Check docker ps to ensure containers bootstrap.'
      ]
    },
    UninstallPlan: {
      Method: 'MSI Removal',
      Plan: [
        'Run docker-compose down on all projects.',
        'Execute uninstall script for docker desktop.'
      ],
      Risks: [
        'Destructive action: Deletes all local images, volumes, configurations, and network switches.',
        'Removes container hosting capability.'
      ],
      Rollback: [
        'Install Docker Desktop from Winget.'
      ],
      Validation: [
        'Verify docker commands fail to execute.'
      ]
    }
  },
  {
    Name: 'VS Code',
    Publisher: 'Microsoft Corporation',
    Vendor: 'Microsoft',
    Category: 'Development Tooling',
    Technology: 'Code Editor',
    Description: 'Visual Studio Code is a code editor redefined and optimized for building and debugging modern web and cloud applications.',
    Tags: ['editor', 'ide', 'development'],
    LatestVersion: '1.84.0',
    ReleaseDate: '2023-11-02',
    SupportStatus: 'Active',
    EOLDate: '2032-12-31',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Current User',
    Instances: [
      {
        Id: 'inst-vscode-1',
        Source: 'Registry',
        InstalledVersion: '1.79.0',
        Scope: 'Current User',
        InstallPath: 'C:\\Users\\rajaj\\AppData\\Local\\Programs\\Microsoft VS Code',
        InstallDate: '2024-06-15',
        Size: '350 MB',
        Architecture: 'x64'
      }
    ],
    Dependencies: [],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Run: winget upgrade --id Microsoft.VisualStudioCode -v 1.84.0 --silent'
      ],
      Risks: [
        'May reload extensions. VS Code must be restarted.'
      ],
      Rollback: [
        'Uninstall VS Code and download 1.79.0 user installer from Microsoft archive.'
      ],
      Validation: [
        'Run: code --version (Expected 1.84.0)'
      ]
    },
    UninstallPlan: {
      Method: 'Silent Uninstall',
      Plan: [
        'Run winget uninstall --id Microsoft.VisualStudioCode',
        'Clean cache files in AppData\\Roaming\\Code'
      ],
      Risks: [
        'Removes user configuration settings and workspace extensions.'
      ],
      Rollback: [
        'Re-install from Store or Winget.'
      ],
      Validation: [
        'Verify `code` command is not available.'
      ]
    }
  },
  {
    Name: 'Poetry',
    Publisher: 'Poetry Team',
    Vendor: 'Python Poetry',
    Category: 'Development Tooling',
    Technology: 'Package Manager',
    Description: 'Poetry is a tool for dependency management and packaging in Python. It allows you to declare the libraries your project depends on and it will manage them.',
    Tags: ['python', 'dependency-management', 'pip'],
    LatestVersion: '1.7.1',
    ReleaseDate: '2023-12-10',
    SupportStatus: 'Active',
    EOLDate: '2028-01-01',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Current User',
    Instances: [
      {
        Id: 'inst-poe-1',
        Source: 'Python',
        InstalledVersion: '1.5.1',
        Scope: 'Current User',
        InstallPath: 'C:\\Users\\rajaj\\AppData\\Roaming\\Python\\Scripts\\poetry.exe',
        InstallDate: '2025-03-20',
        Size: '8 MB',
        Architecture: 'n/a',
        DetailValue: 'Installed via pip (Python 3.11)'
      }
    ],
    Dependencies: [
      { Name: 'Python', Relation: 'Depends On', PackageName: 'Python' }
    ],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Semi-Automated',
      Plan: [
        'Execute: pip install --upgrade poetry==1.7.1'
      ],
      Risks: [
        'Poetry 1.7.1 requires Python >= 3.8. It is fully compatible with local Python 3.11.'
      ],
      Rollback: [
        'Reinstall version 1.5.1: pip install poetry==1.5.1'
      ],
      Validation: [
        'Run: poetry --version (Expected 1.7.1)'
      ]
    },
    UninstallPlan: {
      Method: 'Package Manager Removal',
      Plan: [
        'Run: pip uninstall poetry -y'
      ],
      Risks: [
        'Breaks Python project dependency resolution and poetry-managed virtual environments.'
      ],
      Rollback: [
        'Run: pip install poetry==1.5.1'
      ],
      Validation: [
        'Verify poetry command fails.'
      ]
    }
  },
  {
    Name: 'JupyterLab',
    Publisher: 'Project Jupyter',
    Vendor: 'NumFOCUS',
    Category: 'Development Tooling',
    Technology: 'Interactive Notebook',
    Description: 'JupyterLab is the latest web-based interactive development environment for notebooks, code, and data.',
    Tags: ['python', 'notebooks', 'data-science', 'ai'],
    LatestVersion: '4.0.9',
    ReleaseDate: '2023-11-25',
    SupportStatus: 'Active',
    EOLDate: '2028-12-31',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Current User',
    Instances: [
      {
        Id: 'inst-jup-1',
        Source: 'Python',
        InstalledVersion: '3.6.3',
        Scope: 'Current User',
        InstallPath: 'C:\\Users\\rajaj\\AppData\\Roaming\\Python\\Scripts\\jupyter-lab.exe',
        InstallDate: '2025-02-18',
        Size: '15 MB',
        Architecture: 'n/a',
        DetailValue: 'Installed via pip (Python 3.11)'
      }
    ],
    Dependencies: [
      { Name: 'Python', Relation: 'Depends On', PackageName: 'Python' }
    ],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Semi-Automated',
      Plan: [
        'Execute: pip install --upgrade jupyterlab==4.0.9'
      ],
      Risks: [
        'JupyterLab v4 introduces extensions compatibility changes. Some old notebook extensions might require updating.'
      ],
      Rollback: [
        'Downgrade: pip install jupyterlab==3.6.3'
      ],
      Validation: [
        'Run: jupyter lab --version'
      ]
    },
    UninstallPlan: {
      Method: 'Package Manager Removal',
      Plan: [
        'Run: pip uninstall jupyterlab -y'
      ],
      Risks: [
        'Removes local web interface hosting for Jupyter IPYNB notebooks.'
      ],
      Rollback: [
        'Reinstall via pip.'
      ],
      Validation: [
        'Verify jupyter lab command is not found.'
      ]
    }
  },
  {
    Name: 'React',
    Publisher: 'Meta Open Source',
    Vendor: 'Meta',
    Category: 'Development Tooling',
    Technology: 'JavaScript Library',
    Description: 'React is a free and open-source front-end JavaScript library for building user interfaces based on components.',
    Tags: ['javascript', 'frontend', 'ui'],
    LatestVersion: '19.0.0',
    ReleaseDate: '2024-12-05',
    SupportStatus: 'End-of-Life',
    EOLDate: '2024-12-05',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Current User',
    Instances: [
      {
        Id: 'inst-react-1',
        Source: 'Node',
        InstalledVersion: '18.2.0',
        Scope: 'Current User',
        InstallPath: 'Project Dependency: C:\\AIProjects\\1_Sentinel\\node_modules\\react',
        InstallDate: '2026-05-10',
        Size: '2.5 MB',
        Architecture: 'n/a'
      }
    ],
    Dependencies: [
      { Name: 'Node.js', Relation: 'Depends On', PackageName: 'Node.js' }
    ],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Semi-Automated',
      Plan: [
        'Update package.json in C:\\AIProjects\\1_Sentinel',
        'Execute: npm install react@latest react-dom@latest'
      ],
      Risks: [
        'React 19 has deprecations and breaking changes. Refactoring of compiler/ref handles might be required.',
        'Requires upgrading TypeScript compiler parameters.'
      ],
      Rollback: [
        'Revert package.json changes and execute: npm install'
      ],
      Validation: [
        'Run dev build compilation check: npm run build'
      ]
    },
    UninstallPlan: {
      Method: 'Package Manager Removal',
      Plan: [
        'Execute npm uninstall react react-dom'
      ],
      Risks: [
        'Critical: Breaks Vite application compilation. Web application cannot load.'
      ],
      Rollback: [
        'Execute npm install react react-dom.'
      ],
      Validation: [
        'Check package.json dependencies.'
      ]
    }
  },
  {
    Name: 'Express',
    Publisher: 'Express Project',
    Vendor: 'Expressjs.com',
    Category: 'Development Tooling',
    Technology: 'JavaScript Framework',
    Description: 'Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.',
    Tags: ['javascript', 'backend', 'express', 'node'],
    LatestVersion: '4.18.3',
    ReleaseDate: '2024-03-05',
    SupportStatus: 'Active',
    EOLDate: '2028-12-31',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Current User',
    Instances: [
      {
        Id: 'inst-exp-1',
        Source: 'Node',
        InstalledVersion: '4.18.2',
        Scope: 'Current User',
        InstallPath: 'Project Dependency: node_modules\\express',
        InstallDate: '2026-05-10',
        Size: '1.2 MB',
        Architecture: 'n/a'
      }
    ],
    Dependencies: [
      { Name: 'Node.js', Relation: 'Depends On', PackageName: 'Node.js' }
    ],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Semi-Automated',
      Plan: [
        'Run: npm install express@4.18.3'
      ],
      Risks: [
        'No breaking changes. This is a minor patch release.'
      ],
      Rollback: [
        'Run: npm install express@4.18.2'
      ],
      Validation: [
        'Verify express is listed in package.json at 4.18.3.'
      ]
    },
    UninstallPlan: {
      Method: 'Package Manager Removal',
      Plan: [
        'Run npm uninstall express'
      ],
      Risks: [
        'Removes web API listener capability if used in server components.'
      ],
      Rollback: [
        'Run npm install express.'
      ],
      Validation: [
        'Check package.json.'
      ]
    }
  },
  {
    Name: 'Postgres',
    Publisher: 'PostgreSQL Global Development Group',
    Vendor: 'PostgreSQL',
    Category: 'Containers',
    Technology: 'Database Engine',
    Description: 'PostgreSQL is a powerful, open-source object-relational database system with over 35 years of active development.',
    Tags: ['database', 'postgres', 'sql', 'storage'],
    LatestVersion: '16.1',
    ReleaseDate: '2023-11-09',
    SupportStatus: 'Active',
    EOLDate: '2027-11-10',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Current User',
    Instances: [
      {
        Id: 'inst-pg-1',
        Source: 'Docker',
        InstalledVersion: '14.5',
        Scope: 'Current User',
        InstallPath: 'Container: sentinel-postgres (Image: postgres:14.5)',
        InstallDate: '2025-08-01',
        Size: '350 MB',
        Architecture: 'x64'
      }
    ],
    Dependencies: [
      { Name: 'Docker Desktop', Relation: 'Depends On', PackageName: 'Docker Desktop' }
    ],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Semi-Automated',
      Plan: [
        'Dump local database schemas via pg_dumpall.',
        'Stop and remove docker container.',
        'Start container using tag postgres:16.1-alpine.',
        'Restore data dumps.'
      ],
      Risks: [
        'Database version upgrade (14 to 16) requires catalog dump and restore; standard file copy upgrades are not supported.',
        'Temporary downtime for services dependent on database.'
      ],
      Rollback: [
        'Stop Postgres 16 container, start Postgres 14 container, restore dump.'
      ],
      Validation: [
        'Check container logs.',
        'Verify database connection port 5432: docker exec -it sentinel-postgres pg_isready'
      ]
    },
    UninstallPlan: {
      Method: 'Package Manager Removal',
      Plan: [
        'Run docker rm -f sentinel-postgres',
        'Delete docker local volume folders.'
      ],
      Risks: [
        'Destructive: Removes all tables, logs, indexes, and schemas stored inside local Docker volume.'
      ],
      Rollback: [
        'Restore from backup database files.'
      ],
      Validation: [
        'Verify postgres container is not running.'
      ]
    }
  },
  {
    Name: 'Nginx',
    Publisher: 'F5 Inc.',
    Vendor: 'Nginx.org',
    Category: 'Containers',
    Technology: 'Web Server',
    Description: 'Nginx is a web server that can also be used as a reverse proxy, load balancer, mail proxy and HTTP cache.',
    Tags: ['web-server', 'nginx', 'proxy'],
    LatestVersion: '1.25.3',
    ReleaseDate: '2023-10-24',
    SupportStatus: 'Active',
    EOLDate: '2028-12-31',
    UpdateState: 'Update Available',
    SecurityRisk: 'Critical',
    Scope: 'Current User',
    Instances: [
      {
        Id: 'inst-nginx-1',
        Source: 'Docker',
        InstalledVersion: '1.22.1',
        Scope: 'Current User',
        InstallPath: 'Container: sentinel-nginx (Image: nginx:1.22.1-alpine)',
        InstallDate: '2025-09-12',
        Size: '24 MB',
        Architecture: 'x64'
      },
      {
        Id: 'inst-nginx-2',
        Source: 'WSL',
        InstalledVersion: '1.22.1',
        Scope: 'System Component',
        InstallPath: '/etc/nginx',
        InstallDate: '2025-10-02',
        Size: '40 MB',
        Architecture: 'x64',
        DetailValue: 'WSL Ubuntu default package'
      }
    ],
    Dependencies: [],
    Vulnerabilities: [
      {
        CveId: 'CVE-2023-44487',
        Cvss: 7.5,
        Severity: 'High',
        Description: 'HTTP/2 Rapid Reset vulnerability allows DDoS resource exhaustion attacks via stream cancellation sequences.',
        AdvisoryUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2023-44487'
      }
    ],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Rebuild nginx container with tag nginx:1.25.3-alpine.',
        'WSL Ubuntu package update: sudo apt-get update && sudo apt-get install nginx'
      ],
      Risks: [
        'Temporary web server routing downtime (1-2 seconds).',
        'HTTP/2 settings structure updates in conf files.'
      ],
      Rollback: [
        'Revert container back to 1.22.1 tag.',
        'Downgrade apt package.'
      ],
      Validation: [
        'Request server test page: curl -I http://localhost:80'
      ]
    },
    UninstallPlan: {
      Method: 'Silent Uninstall',
      Plan: [
        'Execute: docker rm -f sentinel-nginx',
        'WSL package removal: sudo apt-get remove nginx -y'
      ],
      Risks: [
        'Disables local reverse proxy gateways and web routing configurations.'
      ],
      Rollback: [
        'Reinstall container or WSL package.'
      ],
      Validation: [
        'Verify http request returns connection refused.'
      ]
    }
  },
  {
    Name: 'Azure CLI',
    Publisher: 'Microsoft Corporation',
    Vendor: 'Microsoft',
    Category: 'Development Tooling',
    Technology: 'Cloud Interface',
    Description: 'The Azure Command-Line Interface (CLI) is a cross-platform command-line tool to connect to Azure and execute administrative commands on Azure resources.',
    Tags: ['cloud', 'azure', 'cli', 'administration'],
    LatestVersion: '2.54.0',
    ReleaseDate: '2023-11-14',
    SupportStatus: 'Active',
    EOLDate: '2029-12-31',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Machine-Wide',
    Instances: [
      {
        Id: 'inst-az-1',
        Source: 'Winget',
        InstalledVersion: '2.49.0',
        Scope: 'Machine-Wide',
        InstallPath: 'C:\\Program Files (x86)\\Microsoft SDKs\\Azure\\CLI2\\wbin\\az.cmd',
        InstallDate: '2025-05-18',
        Size: '95 MB',
        Architecture: 'x86'
      },
      {
        Id: 'inst-az-2',
        Source: 'Chocolatey',
        InstalledVersion: '2.49.0',
        Scope: 'Machine-Wide',
        InstallPath: 'C:\\ProgramData\\chocolatey\\bin\\az.exe',
        InstallDate: '2025-05-20',
        Size: '98 MB',
        Architecture: 'x86'
      }
    ],
    Dependencies: [],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Run: winget upgrade --id Microsoft.AzureCLI -v 2.54.0 --silent'
      ],
      Risks: [
        'Backward compatible changes. Relies on Python core, which is bundled inside the installer.'
      ],
      Rollback: [
        'Uninstall CLI and execute manual MSI downgrade.'
      ],
      Validation: [
        'Run: az --version'
      ]
    },
    UninstallPlan: {
      Method: 'MSI Removal',
      Plan: [
        'Run: winget uninstall --id Microsoft.AzureCLI'
      ],
      Risks: [
        'Disables local cloud orchestration scripts and Azure API commands.'
      ],
      Rollback: [
        'Reinstall from Winget.'
      ],
      Validation: [
        'Verify az command is not found.'
      ]
    }
  },
  {
    Name: 'Chocolatey GUI',
    Publisher: 'Chocolatey Software',
    Vendor: 'Chocolatey',
    Category: 'Package Managers',
    Technology: 'GUI Application',
    Description: 'Chocolatey GUI is a user interface for Chocolatey Package Manager that allows operators to view local packages and update them visually.',
    Tags: ['package-manager', 'gui', 'windows'],
    LatestVersion: '2.1.0',
    ReleaseDate: '2023-09-01',
    SupportStatus: 'Deprecated',
    EOLDate: '2025-06-05',
    UpdateState: 'Deprecated',
    SecurityRisk: 'None',
    Scope: 'Machine-Wide',
    Instances: [
      {
        Id: 'inst-chocog-1',
        Source: 'Chocolatey',
        InstalledVersion: '0.18.0',
        Scope: 'Machine-Wide',
        InstallPath: 'C:\\ProgramData\\chocolatey\\lib\\chocolateygui\\tools\\ChocolateyGUI.exe',
        InstallDate: '2024-04-12',
        Size: '18 MB',
        Architecture: 'x64'
      }
    ],
    Dependencies: [],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Run: choco upgrade chocolateygui -y'
      ],
      Risks: [
        'Note: Software is deprecated. Upgrading updates configuration metadata, but operators are advised to migrate to CLI core.'
      ],
      Rollback: [
        'Downgrade: choco install chocolateygui --version 0.18.0 --allow-downgrade'
      ],
      Validation: [
        'Run ChocolateyGUI.exe and check Help panel.'
      ]
    },
    UninstallPlan: {
      Method: 'Package Manager Removal',
      Plan: [
        'Run choco uninstall chocolateygui -y'
      ],
      Risks: [
        'Removes GUI display. CLI remains active.'
      ],
      Rollback: [
        'Run choco install chocolateygui.'
      ],
      Validation: [
        'Confirm GUI icon is removed.'
      ]
    }
  },
  {
    Name: 'Scoop Package Manager',
    Publisher: 'Scoop Community',
    Vendor: 'Scoop.sh',
    Category: 'Package Managers',
    Technology: 'CLI Tool',
    Description: 'Scoop is a command-line installer for Windows that installs programs to your user directory to avoid permission prompts.',
    Tags: ['package-manager', 'scoop', 'cli'],
    LatestVersion: '0.3.0',
    ReleaseDate: '2024-02-15',
    SupportStatus: 'Active',
    EOLDate: '2030-01-01',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Current User',
    Instances: [
      {
        Id: 'inst-scoop-1',
        Source: 'Scoop',
        InstalledVersion: '0.2.2',
        Scope: 'Current User',
        InstallPath: 'C:\\Users\\rajaj\\scoop\\apps\\scoop\\current\\bin\\scoop.ps1',
        InstallDate: '2025-01-05',
        Size: '2 MB',
        Architecture: 'n/a'
      }
    ],
    Dependencies: [],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Fully Automated',
      Plan: [
        'Run: scoop update'
      ],
      Risks: [
        'No risks. Scoop self-upgrades Git hooks automatically.'
      ],
      Rollback: [
        'Manual git revert in Scoop core folder.'
      ],
      Validation: [
        'Run: scoop --version'
      ]
    },
    UninstallPlan: {
      Method: 'Manual Removal',
      Plan: [
        'Delete Scoop root folder C:\\Users\\rajaj\\scoop'
      ],
      Risks: [
        'Destructive: Removes all user-space software installed via Scoop (e.g. user-space Git).'
      ],
      Rollback: [
        'Re-run scoop installation powershell snippet.'
      ],
      Validation: [
        'Verify scoop command throws file not found.'
      ]
    }
  },
  {
    Name: 'JDK 17',
    Publisher: 'Oracle Corporation',
    Vendor: 'Oracle Java',
    Category: 'Development Tooling',
    Technology: 'Java JDK',
    Description: 'Java SE Development Kit is a development environment for building applications and components using the Java programming language.',
    Tags: ['java', 'jdk', 'development', 'compiler'],
    LatestVersion: '17.0.9',
    ReleaseDate: '2023-10-17',
    SupportStatus: 'Active LTS',
    EOLDate: '2030-09-01',
    UpdateState: 'Update Available',
    SecurityRisk: 'None',
    Scope: 'Machine-Wide',
    Instances: [
      {
        Id: 'inst-java-1',
        Source: 'MSI',
        InstalledVersion: '17.0.7',
        Scope: 'Machine-Wide',
        InstallPath: 'C:\\Program Files\\Java\\jdk-17.0.7',
        InstallDate: '2024-05-12',
        Size: '280 MB',
        Architecture: 'x64'
      }
    ],
    Dependencies: [],
    Vulnerabilities: [],
    UpgradePlan: {
      Category: 'Manual',
      Plan: [
        'Download jdk-17.0.9_windows-x64_bin.msi installer from Oracle.',
        'Run installer, select destination folder to overwrite jdk-17.0.7.',
        'Update JAVA_HOME environment system variable to C:\\Program Files\\Java\\jdk-17.0.9.'
      ],
      Risks: [
        'Requires administrative permissions.',
        'Requires restarting local development terminals to reload JAVA_HOME.'
      ],
      Rollback: [
        'Reinstall 17.0.7 MSI and update path environment settings.'
      ],
      Validation: [
        'Run: java -version (Expected 17.0.9)'
      ]
    },
    UninstallPlan: {
      Method: 'MSI Removal',
      Plan: [
        'Uninstall JDK 17 via Programs and Features.',
        'Delete C:\\Program Files\\Java\\jdk-17 folder.'
      ],
      Risks: [
        'Disables local Java build pipelines (Maven, Gradle, JVM applications).'
      ],
      Rollback: [
        'Re-install JDK from Oracle installer.'
      ],
      Validation: [
        'Verify java -version command fails.'
      ]
    }
  }
];
