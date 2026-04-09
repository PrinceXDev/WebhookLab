import { AlertCircle } from "lucide-react";
import Link from "next/link";

const SetupBanner = () => {
  if (process.env.GITHUB_CLIENT_ID?.trim() !== "") {
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
              Add{" "}
              <code className="rounded bg-yellow-100 px-1 py-0.5 text-xs dark:bg-yellow-900/40">
                GITHUB_CLIENT_ID
              </code>{" "}
              and{" "}
              <code className="rounded bg-yellow-100 px-1 py-0.5 text-xs dark:bg-yellow-900/40">
                GITHUB_CLIENT_SECRET
              </code>{" "}
              to{" "}
              <code className="rounded bg-yellow-100 px-1 py-0.5 text-xs dark:bg-yellow-900/40">
                .env.local
              </code>{" "}
              (create an app in{" "}
              <Link
                href="https://github.com/settings/developers"
                target="_blank"
                className="underline font-semibold hover:text-yellow-900 dark:hover:text-yellow-100"
              >
                GitHub developer settings
              </Link>
              ).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupBanner;
