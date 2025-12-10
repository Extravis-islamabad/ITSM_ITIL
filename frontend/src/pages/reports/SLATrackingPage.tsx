import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import reportingService from '@/services/reportingService';
import {
  UserGroupIcon,
  FolderIcon,
  ChartBarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

type ViewTab = 'customer' | 'project' | 'percentage';

const COLORS = {
  primary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  secondary: '#6b7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#10b981',
};

export default function SLATrackingPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('customer');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['sla-by-customer', dateRange],
    queryFn: () => reportingService.getSLAByCustomer(dateRange.start_date, dateRange.end_date),
    enabled: activeTab === 'customer',
  });

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['sla-by-project', dateRange],
    queryFn: () => reportingService.getSLAByProject(dateRange.start_date, dateRange.end_date),
    enabled: activeTab === 'project',
  });

  const { data: percentageData, isLoading: percentageLoading } = useQuery({
    queryKey: ['sla-by-percentage', dateRange],
    queryFn: () => reportingService.getSLAByPercentage(dateRange.start_date, dateRange.end_date),
    enabled: activeTab === 'percentage',
  });

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 95) return 'text-green-600 bg-green-100';
    if (compliance >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const tabs = [
    { id: 'customer' as ViewTab, label: 'By Customer', icon: UserGroupIcon },
    { id: 'project' as ViewTab, label: 'By Project', icon: FolderIcon },
    { id: 'percentage' as ViewTab, label: 'By Percentage', icon: ChartBarIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SLA Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track SLA compliance by Customer, Project, and Percentage metrics
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="form-input py-1.5 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="form-input py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'customer' && (
        <div className="space-y-6">
          {customerLoading ? (
            <LoadingSpinner />
          ) : customerData?.customers?.length > 0 ? (
            <>
              {/* Customer SLA Table */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">SLA Compliance by Customer</h3>
                </CardHeader>
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                            Customer
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Total Tickets
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Resolution Compliance
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Response Compliance
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Breached
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Avg Resolution (hrs)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {customerData.customers.map((customer: any) => (
                          <tr key={customer.customer_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{customer.customer_name}</div>
                              <div className="text-sm text-gray-500">{customer.customer_email}</div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">{customer.total_tickets}</td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${getComplianceColor(
                                  customer.resolution_compliance
                                )}`}
                              >
                                {customer.resolution_compliance}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${getComplianceColor(
                                  customer.response_compliance
                                )}`}
                              >
                                {customer.response_compliance}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-red-600">
                              {customer.resolution_breached}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">{customer.avg_resolution_hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>

              {/* Customer Compliance Chart */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Customer Compliance Overview</h3>
                </CardHeader>
                <CardBody>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerData.customers.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="customer_name" width={150} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="resolution_compliance" fill={COLORS.primary} name="Resolution %" />
                        <Bar dataKey="response_compliance" fill={COLORS.success} name="Response %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No customer data available</div>
          )}
        </div>
      )}

      {activeTab === 'project' && (
        <div className="space-y-6">
          {projectLoading ? (
            <LoadingSpinner />
          ) : projectData?.projects?.length > 0 ? (
            <>
              {/* Project SLA Table */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">SLA Compliance by Project/Category</h3>
                </CardHeader>
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                            Project/Category
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Tickets
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Resolution %
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Response %
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Avg Resolution
                          </th>
                          <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                            Avg Response
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {projectData.projects.map((project: any) => (
                          <tr key={project.project_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{project.project_name}</div>
                              {project.project_description && (
                                <div className="text-sm text-gray-500">{project.project_description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">{project.total_tickets}</td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${getComplianceColor(
                                  project.resolution_compliance
                                )}`}
                              >
                                {project.resolution_compliance}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${getComplianceColor(
                                  project.response_compliance
                                )}`}
                              >
                                {project.response_compliance}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">{project.avg_resolution_hours} hrs</td>
                            <td className="px-4 py-3 text-center text-sm">{project.avg_response_minutes} min</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>

              {/* Project Compliance Chart */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Project Compliance Comparison</h3>
                </CardHeader>
                <CardBody>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectData.projects}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="project_name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="resolution_compliance" fill={COLORS.primary} name="Resolution Compliance %" />
                        <Bar dataKey="response_compliance" fill={COLORS.success} name="Response Compliance %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No project data available</div>
          )}
        </div>
      )}

      {activeTab === 'percentage' && (
        <div className="space-y-6">
          {percentageLoading ? (
            <LoadingSpinner />
          ) : percentageData ? (
            <>
              {/* Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardBody>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Tickets</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {percentageData.overall?.total_tickets || 0}
                      </p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Overall Compliance</p>
                      <p
                        className={`text-3xl font-bold ${
                          (percentageData.overall?.overall_compliance_percentage || 0) >= 95
                            ? 'text-green-600'
                            : (percentageData.overall?.overall_compliance_percentage || 0) >= 80
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {percentageData.overall?.overall_compliance_percentage || 0}%
                      </p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Resolution Compliance</p>
                      <p className="text-3xl font-bold text-primary-600">
                        {percentageData.overall?.resolution_compliance_percentage || 0}%
                      </p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Response Compliance</p>
                      <p className="text-3xl font-bold text-green-600">
                        {percentageData.overall?.response_compliance_percentage || 0}%
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* By Priority */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Compliance by Priority</h3>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                              Priority
                            </th>
                            <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                              Tickets
                            </th>
                            <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                              Resolution %
                            </th>
                            <th className="px-4 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">
                              Response %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {percentageData.by_priority?.map((item: any) => (
                            <tr key={item.priority}>
                              <td className="px-4 py-3">
                                <span
                                  className="px-2 py-1 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: `${PRIORITY_COLORS[item.priority]}20`,
                                    color: PRIORITY_COLORS[item.priority],
                                  }}
                                >
                                  {item.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm">{item.total_tickets}</td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${getComplianceColor(
                                    item.resolution_compliance_percentage
                                  )}`}
                                >
                                  {item.resolution_compliance_percentage}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${getComplianceColor(
                                    item.response_compliance_percentage
                                  )}`}
                                >
                                  {item.response_compliance_percentage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={percentageData.by_priority}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="priority" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="resolution_compliance_percentage" name="Resolution %">
                            {percentageData.by_priority?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || COLORS.secondary} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Weekly Trend */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Weekly Compliance Trend</h3>
                </CardHeader>
                <CardBody>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={percentageData.weekly_trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week_start" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="compliance_percentage"
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          name="Compliance %"
                          dot={{ fill: COLORS.primary }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">No percentage data available</div>
          )}
        </div>
      )}
    </div>
  );
}
