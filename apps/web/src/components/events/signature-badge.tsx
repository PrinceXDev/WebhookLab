import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ShieldX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface StatusConfig {
  icon: LucideIcon;
  variant: "default" | "destructive" | "outline";
  className: string;
  label: string;
}

const getProviderIcon = (provider: string): string => {
  const icons: Record<string, string> = {
    stripe: "💳",
    github: "🐙",
    shopify: "🛍️",
  };
  return icons[provider.toLowerCase()] ?? "🔗";
};

const getProviderDisplayName = (provider: string): string => {
  const names: Record<string, string> = {
    stripe: "Stripe",
    github: "GitHub",
    shopify: "Shopify",
  };
  return names[provider.toLowerCase()] ?? provider;
};

const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case "verified":
      return {
        icon: ShieldCheck,
        variant: "default",
        className:
          "bg-green-600 hover:bg-green-700 text-white border-green-700",
        label: "Verified",
      };
    case "failed":
      return {
        icon: ShieldX,
        variant: "destructive",
        className: "bg-red-600 hover:bg-red-700 text-white border-red-700",
        label: "Failed",
      };
    case "missing_signature":
      return {
        icon: ShieldAlert,
        variant: "outline",
        className:
          "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
        label: "No Signature",
      };
    case "missing_secret":
      return {
        icon: ShieldQuestion,
        variant: "outline",
        className:
          "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        label: "No Secret",
      };
    default:
      return {
        icon: Shield,
        variant: "outline",
        className:
          "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        label: "Unknown",
      };
  }
};

export const SignatureBadge = ({
  verification,
  className,
}: SignatureBadgeProps) => {
  if (!verification || verification.status === "not_applicable") {
    return null;
  }

  const { status, provider, algorithm, message } = verification;
  const {
    icon: Icon,
    variant,
    className: statusClassName,
    label,
  } = getStatusConfig(status);
  const providerIcon = getProviderIcon(provider);

  return (
    <Badge
      variant={variant}
      className={cn(statusClassName, "gap-1.5 px-2.5 py-1", className)}
      title={message ?? status}
    >
      <Icon className="h-3 w-3" />
      <span>{providerIcon}</span>
      <span className="font-medium">{label}</span>
      {algorithm && (
        <span className="text-[10px] opacity-75">({algorithm})</span>
      )}
    </Badge>
  );
};

export const SignatureStatusIndicator = ({
  verification,
}: SignatureBadgeProps) => {
  if (!verification || verification.status === "not_applicable") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>No signature verification</span>
      </div>
    );
  }

  const { status, provider, message } = verification;
  const { icon: Icon } = getStatusConfig(status);

  return (
    <div className="flex items-center gap-2">
      <Icon
        className={cn(
          "h-4 w-4",
          status === "verified" && "text-green-600",
          status === "failed" && "text-red-600",
          status === "missing_signature" && "text-yellow-600",
          status === "missing_secret" && "text-gray-500",
        )}
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {getProviderDisplayName(provider)} Signature
        </span>
        <span className="text-xs text-muted-foreground">
          {message ?? status}
        </span>
      </div>
    </div>
  );
};
