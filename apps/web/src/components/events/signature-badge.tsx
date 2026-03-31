import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignatureBadgeProps {
  verification?: {
    provider: string;
    isValid: boolean;
    status: string;
    algorithm?: string;
    message?: string;
  };
  className?: string;
}

export function SignatureBadge({ verification, className }: SignatureBadgeProps) {
  if (!verification || verification.status === 'not_applicable') {
    return null;
  }

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      stripe: '💳',
      github: '🐙',
      shopify: '🛍️',
    };
    return icons[provider.toLowerCase()] || '🔗';
  };

  const getStatusConfig = (status: string, isValid: boolean) => {
    switch (status) {
      case 'verified':
        return {
          icon: ShieldCheck,
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700 text-white border-green-700',
          label: 'Verified',
        };
      case 'failed':
        return {
          icon: ShieldX,
          variant: 'destructive' as const,
          className: 'bg-red-600 hover:bg-red-700 text-white border-red-700',
          label: 'Failed',
        };
      case 'missing_signature':
        return {
          icon: ShieldAlert,
          variant: 'outline' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
          label: 'No Signature',
        };
      case 'missing_secret':
        return {
          icon: ShieldQuestion,
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
          label: 'No Secret',
        };
      default:
        return {
          icon: Shield,
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
          label: 'Unknown',
        };
    }
  };

  const config = getStatusConfig(verification.status, verification.isValid);
  const Icon = config.icon;
  const providerIcon = getProviderIcon(verification.provider);

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, 'gap-1.5 px-2.5 py-1', className)}
      title={verification.message || verification.status}
    >
      <Icon className="h-3 w-3" />
      <span>{providerIcon}</span>
      <span className="font-medium">{config.label}</span>
      {verification.algorithm && (
        <span className="text-[10px] opacity-75">({verification.algorithm})</span>
      )}
    </Badge>
  );
}

export function SignatureStatusIndicator({ verification }: SignatureBadgeProps) {
  if (!verification || verification.status === 'not_applicable') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>No signature verification</span>
      </div>
    );
  }

  const config = getStatusConfig(verification.status, verification.isValid);
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Icon className={cn(
        'h-4 w-4',
        verification.status === 'verified' && 'text-green-600',
        verification.status === 'failed' && 'text-red-600',
        verification.status === 'missing_signature' && 'text-yellow-600',
        verification.status === 'missing_secret' && 'text-gray-500'
      )} />
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {getProviderDisplayName(verification.provider)} Signature
        </span>
        <span className="text-xs text-muted-foreground">
          {verification.message || verification.status}
        </span>
      </div>
    </div>
  );
}

function getStatusConfig(status: string, isValid: boolean) {
  switch (status) {
    case 'verified':
      return {
        icon: ShieldCheck,
        variant: 'default' as const,
        className: 'bg-green-600 hover:bg-green-700 text-white border-green-700',
        label: 'Verified',
      };
    case 'failed':
      return {
        icon: ShieldX,
        variant: 'destructive' as const,
        className: 'bg-red-600 hover:bg-red-700 text-white border-red-700',
        label: 'Failed',
      };
    case 'missing_signature':
      return {
        icon: ShieldAlert,
        variant: 'outline' as const,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        label: 'No Signature',
      };
    case 'missing_secret':
      return {
        icon: ShieldQuestion,
        variant: 'outline' as const,
        className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
        label: 'No Secret',
      };
    default:
      return {
        icon: Shield,
        variant: 'outline' as const,
        className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
        label: 'Unknown',
      };
  }
}

function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    stripe: 'Stripe',
    github: 'GitHub',
    shopify: 'Shopify',
  };
  return names[provider.toLowerCase()] || provider;
}
