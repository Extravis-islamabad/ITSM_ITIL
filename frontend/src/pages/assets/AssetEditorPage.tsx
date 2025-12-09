import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ServerIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { assetService } from '@/services/assetService';
import { userService } from '@/services/userService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';
import { Card, CardBody } from '@/components/common/Card';
import { User } from '@/types';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, name: 'Basic Info', icon: InformationCircleIcon, description: 'Asset details' },
  { id: 2, name: 'Technical', icon: ServerIcon, description: 'Technical specs' },
  { id: 3, name: 'Financial', icon: CurrencyDollarIcon, description: 'Purchase info' },
  { id: 4, name: 'Warranty', icon: ShieldCheckIcon, description: 'Warranty details' },
];

export default function AssetEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const currentStepRef = useRef(currentStep);

  // Keep ref in sync with state
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  // Fetch asset if editing
  const { data: asset, isLoading: assetLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAsset(Number(id)),
    enabled: !!isEdit,
  });

  // Fetch asset types
  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => assetService.getAssetTypes(true),
  });

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers({ page: 1, page_size: 1000 }),
  });

  const users = usersData?.items || [];

  useEffect(() => {
    if (asset) {
      reset(asset);
    }
  }, [asset, reset]);

  const onSubmit = async (data: Record<string, any>) => {
    // Use ref to get the most current step value (avoids closure issues)
    const step = currentStepRef.current;

    // Only submit on the final step (step 4) - ignore form submission on earlier steps
    if (step !== STEPS.length) {
      if (step < STEPS.length) {
        setCurrentStep(step + 1);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean and convert data types
      const cleanData: Record<string, any> = {};

      // Date fields that need conversion from YYYY-MM-DD to ISO datetime
      const dateFields = [
        'purchase_date', 'warranty_start_date', 'warranty_end_date',
        'deployment_date', 'retirement_date', 'disposal_date', 'license_expiry'
      ];

      for (const [key, value] of Object.entries(data)) {
        // Skip empty values
        if (value === '' || value === 'null' || value === undefined) {
          continue;
        }

        // Convert numeric fields to numbers
        if (['asset_type_id', 'department_id', 'assigned_to_id', 'license_seats'].includes(key)) {
          cleanData[key] = value ? Number(value) : null;
        }
        // Convert decimal fields
        else if (['purchase_cost', 'current_value'].includes(key)) {
          cleanData[key] = value ? parseFloat(value) : null;
        }
        // Convert date fields to ISO datetime format
        else if (dateFields.includes(key) && value) {
          // HTML date input returns YYYY-MM-DD, backend expects datetime
          // Append T00:00:00 to make it a valid ISO datetime
          cleanData[key] = value.includes('T') ? value : `${value}T00:00:00`;
        }
        // Keep other values as is
        else {
          cleanData[key] = value;
        }
      }

      if (isEdit) {
        await assetService.updateAsset(Number(id), cleanData);
        toast.success('Asset updated successfully');
      } else {
        if (!cleanData.asset_tag) {
          cleanData.asset_tag = assetService.generateAssetTag();
        }
        await assetService.createAsset(cleanData);
        toast.success('Asset created successfully');
      }
      navigate('/assets');
    } catch (error: any) {
      // Handle validation errors properly
      const errorDetail = error.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        // Pydantic validation errors are returned as an array
        const errorMessages = errorDetail.map((e: any) => e.msg || e.message || 'Validation error').join(', ');
        toast.error(errorMessages);
      } else if (typeof errorDetail === 'string') {
        toast.error(errorDetail);
      } else {
        toast.error('Failed to save asset');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isEdit && assetLoading) return <LoadingSpinner />;

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'complete';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/assets')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="h-8 w-px bg-gray-300" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-primary-600" />
              {isEdit ? 'Edit Asset' : 'Create New Asset'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Update asset information' : 'Add a new asset to your inventory'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardBody>
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {STEPS.map((step, stepIdx) => {
                const status = getStepStatus(step.id);
                const Icon = step.icon;

                return (
                  <li key={step.name} className="flex-1 relative">
                    {stepIdx !== STEPS.length - 1 && (
                      <div className="absolute top-5 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-0.5">
                        <div className={`h-full ${status === 'complete' ? 'bg-primary-600' : 'bg-gray-200'}`} />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className="relative flex flex-col items-center group w-full"
                    >
                      <span className={`
                        w-10 h-10 flex items-center justify-center rounded-full border-2
                        transition-all duration-200 relative z-10
                        ${status === 'complete'
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : status === 'current'
                          ? 'border-primary-600 bg-white text-primary-600 ring-4 ring-primary-100'
                          : 'border-gray-300 bg-white text-gray-400 group-hover:border-gray-400'
                        }
                      `}>
                        {status === 'complete' ? (
                          <CheckCircleIcon className="w-6 h-6" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </span>
                      <span className="mt-2 text-xs font-medium text-gray-900">
                        {step.name}
                      </span>
                      <span className="text-xs text-gray-500 hidden sm:block">
                        {step.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </CardBody>
      </Card>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (currentStepRef.current === STEPS.length) {
            handleSubmit(onSubmit)(e);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && currentStepRef.current !== STEPS.length) {
            e.preventDefault();
          }
        }}
        className="space-y-6"
      >
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardBody>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <InformationCircleIcon className="w-6 h-6 text-primary-600" />
                  Basic Information
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enter the fundamental details about this asset
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Asset Tag <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('asset_tag', { required: !isEdit })}
                    className="form-input w-full"
                    placeholder="Auto-generated if empty"
                  />
                  {errors.asset_tag && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
                      Asset tag is required
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Unique identifier for this asset</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Asset Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: true })}
                    className="form-input w-full"
                    placeholder="e.g., Dell Latitude 7420"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
                      Name is required
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Asset Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('asset_type_id', { required: true })}
                    className="form-input w-full"
                  >
                    <option value="">Select asset type...</option>
                    {assetTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  {errors.asset_type_id && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-600 rounded-full" />
                      Asset type is required
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Status</label>
                  <select {...register('status')} className="form-input w-full">
                    <option value="NEW">New</option>
                    <option value="ACTIVE">Active</option>
                    <option value="IN_MAINTENANCE">In Maintenance</option>
                    <option value="RETIRED">Retired</option>
                    <option value="DISPOSED">Disposed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Manufacturer</label>
                  <input
                    type="text"
                    {...register('manufacturer')}
                    className="form-input w-full"
                    placeholder="e.g., Dell, HP, Apple"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Model</label>
                  <input
                    type="text"
                    {...register('model')}
                    className="form-input w-full"
                    placeholder="e.g., Latitude 7420"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Serial Number</label>
                  <input
                    type="text"
                    {...register('serial_number')}
                    className="form-input w-full"
                    placeholder="e.g., SN123456789"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Condition</label>
                  <select {...register('condition')} className="form-input w-full">
                    <option value="">Select condition...</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Location</label>
                  <input
                    type="text"
                    {...register('location')}
                    className="form-input w-full"
                    placeholder="e.g., Building A, Floor 3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Assigned To</label>
                  <select {...register('assigned_to_id')} className="form-input w-full">
                    <option value="">Unassigned</option>
                    {users.map((user: User) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Description</label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="form-input w-full"
                    placeholder="Detailed description of the asset..."
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 2: Technical Details */}
        {currentStep === 2 && (
          <Card>
            <CardBody>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <ServerIcon className="w-6 h-6 text-primary-600" />
                  Technical Details
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Network and technical specifications
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Hostname</label>
                  <input
                    type="text"
                    {...register('hostname')}
                    className="form-input w-full"
                    placeholder="e.g., LAPTOP-ABC123"
                  />
                  <p className="text-xs text-gray-500">Computer network name</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">IP Address</label>
                  <input
                    type="text"
                    {...register('ip_address')}
                    className="form-input w-full"
                    placeholder="e.g., 192.168.1.100"
                  />
                  <p className="text-xs text-gray-500">Network IP address</p>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">MAC Address</label>
                  <input
                    type="text"
                    {...register('mac_address')}
                    className="form-input w-full"
                    placeholder="e.g., 00:1B:63:84:45:E6"
                  />
                  <p className="text-xs text-gray-500">Physical hardware address</p>
                </div>

                <div className="md:col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Technical Information</p>
                        <p>These fields are optional but help with network management and tracking.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 3: Financial Information */}
        {currentStep === 3 && (
          <Card>
            <CardBody>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <CurrencyDollarIcon className="w-6 h-6 text-primary-600" />
                  Financial Information
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Purchase and cost details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Purchase Date</label>
                  <input
                    type="date"
                    {...register('purchase_date')}
                    className="form-input w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Supplier</label>
                  <input
                    type="text"
                    {...register('supplier')}
                    className="form-input w-full"
                    placeholder="e.g., Dell Direct, Amazon"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Purchase Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      {...register('purchase_cost')}
                      className="form-input w-full pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Current Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      {...register('current_value')}
                      className="form-input w-full pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <CurrencyDollarIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">Financial Tracking</p>
                        <p>Track depreciation and asset value over time for accurate reporting.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 4: Warranty */}
        {currentStep === 4 && (
          <Card>
            <CardBody>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <ShieldCheckIcon className="w-6 h-6 text-primary-600" />
                  Warranty Information
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Warranty and support details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Warranty Provider</label>
                  <input
                    type="text"
                    {...register('warranty_provider')}
                    className="form-input w-full"
                    placeholder="e.g., Dell ProSupport, AppleCare"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    {...register('warranty_start_date')}
                    className="form-input w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">End Date</label>
                  <input
                    type="date"
                    {...register('warranty_end_date')}
                    className="form-input w-full"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <ShieldCheckIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-purple-800">
                        <p className="font-medium mb-1">Warranty Protection</p>
                        <p>Keep track of warranty coverage to ensure timely support and repairs.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/assets')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={(e) => nextStep(e)}
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                {isSubmitting ? 'Saving...' : isEdit ? 'Update Asset' : 'Create Asset'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
