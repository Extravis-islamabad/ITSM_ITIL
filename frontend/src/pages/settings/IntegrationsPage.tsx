import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
  PlayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  integrationService,
  Integration,
  IntegrationCreate,
  IntegrationType,
  ImportJob,
  PreviewItem,
} from '@/services/integrationService';

// Integration logos/icons
const IntegrationIcon = ({ type }: { type: IntegrationType }) => {
  const iconClass = "h-8 w-8";

  switch (type) {
    case 'JIRA':
      return (
        <div className="p-2 bg-blue-100 rounded-lg">
          <svg className={iconClass} viewBox="0 0 24 24" fill="#0052CC">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
          </svg>
        </div>
      );
    case 'TRELLO':
      return (
        <div className="p-2 bg-sky-100 rounded-lg">
          <svg className={iconClass} viewBox="0 0 24 24" fill="#0079BF">
            <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.656 1.343 3 3 3h18c1.656 0 3-1.344 3-3V3c0-1.657-1.344-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .794-.645 1.44-1.44 1.44h-4.44c-.795 0-1.44-.646-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z"/>
          </svg>
        </div>
      );
    case 'ASANA':
      return (
        <div className="p-2 bg-red-100 rounded-lg">
          <svg className={iconClass} viewBox="0 0 24 24" fill="#F06A6A">
            <circle cx="12" cy="6" r="4"/>
            <circle cx="4" cy="16" r="4"/>
            <circle cx="20" cy="16" r="4"/>
          </svg>
        </div>
      );
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
    INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon },
    ERROR: { bg: 'bg-red-100', text: 'text-red-800', icon: ExclamationCircleIcon },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: ClockIcon };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
};

interface IntegrationFormData {
  name: string;
  integration_type: IntegrationType;
  api_url: string;
  api_key: string;
  api_secret: string;
  username: string;
  jira_project_key: string;
  trello_board_id: string;
  asana_workspace_id: string;
  asana_project_id: string;
  auto_sync: boolean;
  import_attachments: boolean;
  import_comments: boolean;
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isJobsModalOpen, setIsJobsModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedType, setSelectedType] = useState<IntegrationType>('JIRA');
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [testingId, setTestingId] = useState<number | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<IntegrationFormData>({
    defaultValues: {
      auto_sync: false,
      import_attachments: true,
      import_comments: true,
    }
  });

  const watchType = watch('integration_type');

  // Fetch integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationService.getIntegrations(),
  });

  // Fetch import jobs for selected integration
  const { data: importJobs } = useQuery({
    queryKey: ['import-jobs', selectedIntegration?.id],
    queryFn: () => selectedIntegration ? integrationService.getImportJobs(selectedIntegration.id) : Promise.resolve([]),
    enabled: !!selectedIntegration && isJobsModalOpen,
    refetchInterval: isJobsModalOpen ? 5000 : false, // Poll every 5s when viewing jobs
  });

  // Create integration mutation
  const createMutation = useMutation({
    mutationFn: (data: IntegrationCreate) => integrationService.createIntegration(data),
    onSuccess: () => {
      toast.success('Integration created successfully');
      setIsCreateModalOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create integration');
    },
  });

  // Update integration mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IntegrationCreate> }) =>
      integrationService.updateIntegration(id, data),
    onSuccess: () => {
      toast.success('Integration updated successfully');
      setIsConfigModalOpen(false);
      setSelectedIntegration(null);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update integration');
    },
  });

  // Delete integration mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => integrationService.deleteIntegration(id),
    onSuccess: () => {
      toast.success('Integration deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete integration');
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: (id: number) => integrationService.testConnection(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      setTestingId(null);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Connection test failed');
      setTestingId(null);
    },
  });

  // Preview import mutation
  const previewMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: any }) =>
      integrationService.previewImport(id, request),
    onSuccess: (result) => {
      setPreviewItems(result.items);
      setPreviewTotal(result.total);
      setIsPreviewModalOpen(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to preview items');
    },
  });

  // Start import mutation
  const importMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: any }) =>
      integrationService.startImport(id, request),
    onSuccess: () => {
      toast.success('Import started successfully');
      setIsImportModalOpen(false);
      setIsPreviewModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to start import');
    },
  });

  const handleTestConnection = (id: number) => {
    setTestingId(id);
    testMutation.mutate(id);
  };

  const handleDelete = (integration: Integration) => {
    if (confirm(`Are you sure you want to delete "${integration.name}"?`)) {
      deleteMutation.mutate(integration.id);
    }
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    reset({
      name: integration.name,
      integration_type: integration.integration_type,
      api_url: integration.api_url || '',
      jira_project_key: integration.jira_project_key || '',
      trello_board_id: integration.trello_board_id || '',
      asana_workspace_id: integration.asana_workspace_id || '',
      asana_project_id: integration.asana_project_id || '',
      auto_sync: integration.auto_sync,
      import_attachments: integration.import_attachments,
      import_comments: integration.import_comments,
    } as any);
    setIsConfigModalOpen(true);
  };

  const handleImport = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsImportModalOpen(true);
  };

  const handleViewJobs = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsJobsModalOpen(true);
  };

  const handlePreview = () => {
    if (!selectedIntegration) return;

    const request: any = {};
    if (selectedIntegration.integration_type === 'JIRA') {
      request.project_key = selectedIntegration.jira_project_key;
    } else if (selectedIntegration.integration_type === 'TRELLO') {
      request.board_id = selectedIntegration.trello_board_id;
    } else if (selectedIntegration.integration_type === 'ASANA') {
      request.project_id = selectedIntegration.asana_project_id;
    }

    previewMutation.mutate({ id: selectedIntegration.id, request });
  };

  const handleStartImport = () => {
    if (!selectedIntegration) return;

    const request: any = {};
    if (selectedIntegration.integration_type === 'JIRA') {
      request.project_key = selectedIntegration.jira_project_key;
    } else if (selectedIntegration.integration_type === 'TRELLO') {
      request.board_id = selectedIntegration.trello_board_id;
    } else if (selectedIntegration.integration_type === 'ASANA') {
      request.project_id = selectedIntegration.asana_project_id;
    }

    importMutation.mutate({ id: selectedIntegration.id, request });
  };

  const onCreateSubmit = (data: IntegrationFormData) => {
    createMutation.mutate({
      name: data.name,
      integration_type: data.integration_type,
      api_url: data.api_url || undefined,
      api_key: data.api_key || undefined,
      api_secret: data.api_secret || undefined,
      username: data.username || undefined,
      jira_project_key: data.jira_project_key || undefined,
      trello_board_id: data.trello_board_id || undefined,
      asana_workspace_id: data.asana_workspace_id || undefined,
      asana_project_id: data.asana_project_id || undefined,
      auto_sync: data.auto_sync,
      import_attachments: data.import_attachments,
      import_comments: data.import_comments,
    });
  };

  const onConfigSubmit = (data: IntegrationFormData) => {
    if (!selectedIntegration) return;
    updateMutation.mutate({
      id: selectedIntegration.id,
      data: {
        name: data.name,
        api_url: data.api_url || undefined,
        api_key: data.api_key || undefined,
        api_secret: data.api_secret || undefined,
        username: data.username || undefined,
        jira_project_key: data.jira_project_key || undefined,
        trello_board_id: data.trello_board_id || undefined,
        asana_workspace_id: data.asana_workspace_id || undefined,
        asana_project_id: data.asana_project_id || undefined,
        auto_sync: data.auto_sync,
        import_attachments: data.import_attachments,
        import_comments: data.import_comments,
      },
    });
  };

  const getJobStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'bg-gray-100', text: 'text-gray-800' },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
      PARTIALLY_COMPLETED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    };
    const { bg, text } = config[status] || config.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect and import data from external tools like JIRA, Trello, and Asana
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Integration Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardBody>
            <div className="flex items-center gap-3">
              <IntegrationIcon type="JIRA" />
              <div>
                <h3 className="font-semibold text-gray-900">JIRA</h3>
                <p className="text-sm text-gray-600">Import issues from Atlassian JIRA</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-sky-50 to-sky-100 border-sky-200">
          <CardBody>
            <div className="flex items-center gap-3">
              <IntegrationIcon type="TRELLO" />
              <div>
                <h3 className="font-semibold text-gray-900">Trello</h3>
                <p className="text-sm text-gray-600">Import cards from Trello boards</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardBody>
            <div className="flex items-center gap-3">
              <IntegrationIcon type="ASANA" />
              <div>
                <h3 className="font-semibold text-gray-900">Asana</h3>
                <p className="text-sm text-gray-600">Import tasks from Asana projects</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Integrations List */}
      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configured Integrations</h2>

          {isLoading ? (
            <LoadingSpinner />
          ) : !integrations || integrations.length === 0 ? (
            <div className="text-center py-12">
              <CloudArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first integration.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {integrations.map((integration) => (
                <div key={integration.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <IntegrationIcon type={integration.integration_type} />
                    <div>
                      <h3 className="font-medium text-gray-900">{integration.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={integration.status} />
                        {integration.last_sync_at && (
                          <span className="text-xs text-gray-500">
                            Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {integration.last_error && (
                        <p className="text-xs text-red-600 mt-1">{integration.last_error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(integration.id)}
                      isLoading={testingId === integration.id}
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigure(integration)}
                    >
                      <Cog6ToothIcon className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
                    {integration.status === 'ACTIVE' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleImport(integration)}
                      >
                        <CloudArrowDownIcon className="h-4 w-4 mr-1" />
                        Import
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewJobs(integration)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(integration)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create Integration Modal */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); reset(); }}
        title="Add Integration"
        size="lg"
      >
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <Input
            label="Integration Name"
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
            placeholder="e.g., My JIRA Project"
            required
          />

          <div>
            <label className="form-label">Integration Type <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('integration_type', { required: 'Type is required' })}
              onChange={(e) => {
                setValue('integration_type', e.target.value as IntegrationType);
                setSelectedType(e.target.value as IntegrationType);
              }}
            >
              <option value="JIRA">JIRA</option>
              <option value="TRELLO">Trello</option>
              <option value="ASANA">Asana</option>
            </select>
          </div>

          {/* JIRA Fields */}
          {(watchType === 'JIRA' || selectedType === 'JIRA') && (
            <>
              <Input
                label="JIRA URL"
                {...register('api_url')}
                placeholder="https://your-domain.atlassian.net"
                helperText="Your Atlassian Cloud URL"
              />
              <Input
                label="Email"
                {...register('username')}
                placeholder="your-email@company.com"
                helperText="Your Atlassian account email"
              />
              <Input
                label="API Token"
                type="password"
                {...register('api_key')}
                placeholder="Your JIRA API token"
                helperText="Generate from Atlassian Account Settings > Security > API tokens"
              />
              <Input
                label="Project Key"
                {...register('jira_project_key')}
                placeholder="e.g., PROJ"
                helperText="The project key to import issues from"
              />
            </>
          )}

          {/* Trello Fields */}
          {(watchType === 'TRELLO') && (
            <>
              <Input
                label="API Key"
                {...register('api_key')}
                placeholder="Your Trello API Key"
                helperText="Get from trello.com/app-key"
              />
              <Input
                label="API Token"
                type="password"
                {...register('api_secret')}
                placeholder="Your Trello Token"
                helperText="Generate from the API Key page"
              />
              <Input
                label="Board ID"
                {...register('trello_board_id')}
                placeholder="e.g., abc123"
                helperText="The board ID to import cards from"
              />
            </>
          )}

          {/* Asana Fields */}
          {(watchType === 'ASANA') && (
            <>
              <Input
                label="Personal Access Token"
                type="password"
                {...register('api_key')}
                placeholder="Your Asana Personal Access Token"
                helperText="Generate from Asana > Settings > Apps > Developer Apps"
              />
              <Input
                label="Workspace ID"
                {...register('asana_workspace_id')}
                placeholder="e.g., 1234567890"
              />
              <Input
                label="Project ID"
                {...register('asana_project_id')}
                placeholder="e.g., 1234567890"
                helperText="The project ID to import tasks from"
              />
            </>
          )}

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('import_attachments')}
                className="form-checkbox h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Import attachments</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('import_comments')}
                className="form-checkbox h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Import comments</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsCreateModalOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
              Create Integration
            </Button>
          </div>
        </form>
      </Modal>

      {/* Configure Integration Modal */}
      <Modal
        open={isConfigModalOpen}
        onClose={() => { setIsConfigModalOpen(false); setSelectedIntegration(null); reset(); }}
        title={`Configure ${selectedIntegration?.name}`}
        size="lg"
      >
        <form onSubmit={handleSubmit(onConfigSubmit)} className="space-y-4">
          <Input
            label="Integration Name"
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
            required
          />

          {selectedIntegration?.integration_type === 'JIRA' && (
            <>
              <Input label="JIRA URL" {...register('api_url')} />
              <Input label="Email" {...register('username')} />
              <Input label="API Token" type="password" {...register('api_key')} placeholder="Leave empty to keep existing" />
              <Input label="Project Key" {...register('jira_project_key')} />
            </>
          )}

          {selectedIntegration?.integration_type === 'TRELLO' && (
            <>
              <Input label="API Key" {...register('api_key')} />
              <Input label="API Token" type="password" {...register('api_secret')} placeholder="Leave empty to keep existing" />
              <Input label="Board ID" {...register('trello_board_id')} />
            </>
          )}

          {selectedIntegration?.integration_type === 'ASANA' && (
            <>
              <Input label="Personal Access Token" type="password" {...register('api_key')} placeholder="Leave empty to keep existing" />
              <Input label="Workspace ID" {...register('asana_workspace_id')} />
              <Input label="Project ID" {...register('asana_project_id')} />
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setIsConfigModalOpen(false); setSelectedIntegration(null); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={isImportModalOpen}
        onClose={() => { setIsImportModalOpen(false); setSelectedIntegration(null); }}
        title={`Import from ${selectedIntegration?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will import all items from {selectedIntegration?.integration_type === 'JIRA' ? 'project' : selectedIntegration?.integration_type === 'TRELLO' ? 'board' : 'project'}{' '}
            <strong>
              {selectedIntegration?.jira_project_key || selectedIntegration?.trello_board_id || selectedIntegration?.asana_project_id}
            </strong>{' '}
            as tickets.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Items that have already been imported will be skipped.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handlePreview} isLoading={previewMutation.isPending}>
              <EyeIcon className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button variant="primary" onClick={handleStartImport} isLoading={importMutation.isPending}>
              <PlayIcon className="h-4 w-4 mr-1" />
              Start Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Import Preview"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Found <strong>{previewTotal}</strong> items. Showing first {previewItems.length}:
          </p>

          <div className="max-h-96 overflow-y-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Key</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status/Labels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewItems.map((item) => (
                  <tr key={item.external_id}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-900">{item.external_key}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.title}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {item.status || item.labels?.join(', ') || (item.completed ? 'Completed' : 'Open')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStartImport} isLoading={importMutation.isPending}>
              <PlayIcon className="h-4 w-4 mr-1" />
              Start Import ({previewTotal} items)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Jobs Modal */}
      <Modal
        open={isJobsModalOpen}
        onClose={() => { setIsJobsModalOpen(false); setSelectedIntegration(null); }}
        title={`Import History - ${selectedIntegration?.name}`}
        size="xl"
      >
        <div className="space-y-4">
          {!importJobs || importJobs.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No import jobs yet</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {importJobs.map((job: ImportJob) => (
                <div key={job.id} className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getJobStatusBadge(job.status)}
                      <span className="text-sm text-gray-600">
                        {job.started_at ? new Date(job.started_at).toLocaleString() : 'Not started'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total:</span>{' '}
                      <span className="font-medium">{job.total_items}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Processed:</span>{' '}
                      <span className="font-medium">{job.processed_items}</span>
                    </div>
                    <div className="text-green-600">
                      <span className="text-gray-500">Success:</span>{' '}
                      <span className="font-medium">{job.successful_items}</span>
                    </div>
                    <div className="text-red-600">
                      <span className="text-gray-500">Failed:</span>{' '}
                      <span className="font-medium">{job.failed_items}</span>
                    </div>
                    <div className="text-gray-500">
                      <span>Skipped:</span>{' '}
                      <span className="font-medium">{job.skipped_items}</span>
                    </div>
                  </div>

                  {job.status === 'IN_PROGRESS' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${job.total_items ? (job.processed_items / job.total_items) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {job.error_log && job.error_log.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-red-600 cursor-pointer">
                        {job.error_log.length} errors
                      </summary>
                      <ul className="mt-1 text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        {job.error_log.slice(0, 10).map((err, i) => (
                          <li key={i}>
                            {err.external_key || err.external_id}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
