"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

export const SetupBanner = () => {
  const isConfigured =
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID &&
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID !== "your-github-oauth-client-id";

  if (isConfigured) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Setup Required:</strong> GitHub OAuth is not configured.
              Follow the{" "}
              <Link
                href="https://github.com/settings/developers"
                target="_blank"
                className="underline font-semibold hover:text-yellow-900 dark:hover:text-yellow-100"
              >
                AUTH_SETUP.md guide
              </Link>{" "}
              to enable authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
