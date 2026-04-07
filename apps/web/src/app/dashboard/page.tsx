import { EndpointList } from '@/components/endpoints/endpoint-list';
import { CreateEndpointButton } from '@/components/endpoints/create-endpoint-button';

const DashboardPage = () => (
  <div className="container mx-auto py-8 px-4">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your webhook endpoints and inspect incoming events
        </p>
      </div>
      <CreateEndpointButton />
    </div>

    <EndpointList />
  </div>
);

export default DashboardPage;
