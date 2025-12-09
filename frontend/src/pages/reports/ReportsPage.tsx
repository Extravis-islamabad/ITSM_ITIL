import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardBody } from '@/components/common/Card';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import axiosInstance from '@/lib/axios';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { FileDown, Calendar, TrendingUp, Users, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import { exportReportToPDF } from '@/utils/pdfExport';

const COLORS = ['#8b5cf6', '#a855f7', '#c084fc', '#e9d5ff', '#f3e8ff', '#faf5ff'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reports-summary', dateRange],
    queryFn: async () => {
      const res = await axiosInstance.get('/reports/summary', { params: dateRange });
      return res.data;
    },
  });

  const { data: volumeData } = useQuery({
    queryKey: ['reports-volume', dateRange],
    queryFn: async () => {
      const res = await axiosInstance.get('/reports/ticket-volume', { params: dateRange });
      return res.data;
    },
  });

  const { data: agentData } = useQuery({
    queryKey: ['reports-agents', dateRange],
    queryFn: async () => {
      const res = await axiosInstance.get('/reports/agent-performance', { params: dateRange });
      return res.data;
    },
  });

  const { data: slaData } = useQuery({
    queryKey: ['reports-sla', dateRange],
    queryFn: async () => {
      const res = await axiosInstance.get('/reports/sla-compliance', { params: dateRange });
      return res.data;
    },
  });

  const { data: categoryData } = useQuery({
    queryKey: ['reports-categories', dateRange],
    queryFn: async () => {
      const res = await axiosInstance.get('/reports/category-analysis', { params: dateRange });
      return res.data;
    },
  });

  const handleExportPDF = async () => {
    try {
      await exportReportToPDF(
        {
          ...summary,
          volumeData: volumeData?.data || [],
          agents: agentData?.agents || [],
          categories: categoryData?.categories || [],
          slaData: slaData,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date,
        },
        'Comprehensive'
      );
    } catch {
      // Silent fail - toast handled in exportReportToPDF
    }
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights into your support operations
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleExportPDF}
          className="bg-gradient-to-r from-primary-600 to-accent-600"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-primary-500" />
            <div className="flex items-center gap-4 flex-1">
              <div>
                <label className="text-xs text-gray-500 font-medium">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                  className="form-input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">End Date</label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                  className="form-input mt-1"
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-blue-500">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Tickets</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total_tickets || 0}</p>
                <p className="text-xs text-gray-500 mt-1">In selected period</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Resolution Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{summary?.resolution_rate?.toFixed(1) || 0}%</p>
                <p className="text-xs text-gray-500 mt-1">{summary?.resolved_tickets || 0} resolved</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Resolution Time</p>
                <p className="text-3xl font-bold text-primary-600 mt-2">{summary?.avg_resolution_hours?.toFixed(1) || 0}h</p>
                <p className="text-xs text-gray-500 mt-1">Average across all tickets</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">SLA Compliance</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{summary?.sla_compliance?.toFixed(1) || 100}%</p>
                <p className="text-xs text-gray-500 mt-1">{summary?.sla_breached || 0} breached</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* No Data Warning */}
      {summary?.total_tickets === 0 && (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">
                No tickets found in the selected date range. Try adjusting your date filters or create some tickets first.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Charts Row 1 */}
      {summary?.total_tickets > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticket Volume */}
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4 text-primary-700">Ticket Volume Trend</h3>
                {volumeData?.data && volumeData.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={volumeData.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="created" stroke="#8b5cf6" strokeWidth={3} name="Created" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} name="Resolved" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="closed" stroke="#6b7280" strokeWidth={2} name="Closed" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    <p>No trend data available</p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4 text-primary-700">Tickets by Category</h3>
                {categoryData?.categories && categoryData.categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData.categories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, total, percent }) => `${category}: ${total} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={90}
                        dataKey="total"
                      >
                        {categoryData.categories.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    <p>No category data available</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Agent Performance Table */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-4 text-primary-700">Agent Performance</h3>
              {agentData?.agents && agentData.agents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-primary-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Assigned</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Resolved</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Resolution Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Avg Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">SLA Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agentData.agents.map((agent: any) => (
                        <tr key={agent.agent_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.agent_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.total_assigned}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.resolved}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge ${agent.resolution_rate >= 80 ? 'bg-green-100 text-green-800' : agent.resolution_rate >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {agent.resolution_rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.avg_resolution_hours}h</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge ${agent.sla_compliance >= 90 ? 'bg-green-100 text-green-800' : agent.sla_compliance >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {agent.sla_compliance.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No agent performance data available</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* SLA Compliance by Priority */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-4 text-primary-700">SLA Compliance by Priority</h3>
              {slaData?.by_priority && slaData.by_priority.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={slaData.by_priority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#c084fc" name="Total Tickets" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="breached" fill="#ef4444" name="Breached" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  <p>No SLA data available</p>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}