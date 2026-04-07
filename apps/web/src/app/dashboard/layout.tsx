import { DashboardNav } from '@/components/layout/dashboard-nav';

const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <DashboardNav />
    <main>{children}</main>
  </div>
);

export default DashboardLayout;
