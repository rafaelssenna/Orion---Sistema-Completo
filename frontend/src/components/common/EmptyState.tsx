import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="text-orion-star-silver/50 mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-orion-star-white mb-1">{title}</h3>
      {description && <p className="text-sm text-orion-star-silver/70 mb-4">{description}</p>}
      {action}
    </div>
  );
}
