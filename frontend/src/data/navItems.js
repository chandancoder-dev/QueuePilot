import { LayoutDashboard, ListChecks, BarChart2, Settings } from 'lucide-react';

export const navItems = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard, href: '#overview'  },
  { id: 'queues',     label: 'My Queues',  icon: ListChecks,       href: '#queues'    },
  { id: 'analytics',  label: 'Analytics',  icon: BarChart2,        href: '#analytics' },
  { id: 'settings',   label: 'Settings',   icon: Settings,         href: '#settings'  },
];
