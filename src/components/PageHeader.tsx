import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  accentColor?: string;
}

export function PageHeader({ title, subtitle, icon: Icon, accentColor = "bg-indigo-600" }: PageHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 mb-10"
    >
      {Icon && (
        <div className={`p-3 ${accentColor} rounded-2xl text-white shadow-lg`}>
          <Icon className="w-8 h-8" />
        </div>
      )}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
