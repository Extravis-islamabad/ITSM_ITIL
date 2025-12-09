import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Card } from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import reportingService, { TicketAgingRequest } from '../../services/reportingService';

const AGING_COLORS: Record<string, string> = {
  '0-24h': '#10b981', // Green - fresh tickets
  '1-3d': '#3b82f6', // Blue - recent
  '3-7d': '#f59e0b', // Yellow - getting old
  '7-14d': '#f97316', // Orange - old
  '14-30d': '#ef4444', // Red - very old
  '30d+': '#991b1b', // Dark red - ancient
};

const TicketAgingReport: React.FC = () => {
  const [filters] = useState<TicketAgingRequest>({});
  const [isExporting, setIsExporting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: agingData, isLoading, error } = useQuery({
    queryKey: ['ticket-aging', filters],
    queryFn: () => reportingService.getTicketAging(filters),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true);
    try {
      await reportingService.exportReport({
        report_type: 'ticket_aging',
        format,
        filters,
      });
      toast.success(`Report exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading aging data. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!agingData) return null;

  // Prepare chart data
  const chartData = Object.entries(agingData.summary).map(([bucket, count]) => ({
    bucket,
    count,
    color: AGING_COLORS[bucket],
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ticket Aging Report</h1>
          <p className="text-gray-600 mt-1">Track how long tickets have been open</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              autoRefresh ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </button>
          <div className="relative group">
            <button disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-t-lg">Export as PDF</button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-gray-50">Export as Excel</button>
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-b-lg">Export as CSV</button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(agingData.summary).map(([bucket, count]) => (
          <Card key={bucket} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{bucket}</p>
              <Clock className="w-4 h-4" style={{ color: AGING_COLORS[bucket] }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: AGING_COLORS[bucket] }}>
              {count}
            </p>
          </Card>
        ))}
      </div>

      {/* Total Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Open Tickets</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {agingData.total_open_tickets}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600">Tickets Over 7 Days</p>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {agingData.summary['7-14d'] + agingData.summary['14-30d'] + agingData.summary['30d+']}
            </p>
          </div>
        </div>
      </Card>

      {/* Aging Distribution Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" name="Tickets">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Ticket Lists by Bucket */}
      <div className="space-y-6">
        {Object.entries(agingData.buckets).map(([bucket, data]) => {
          if (data.count === 0) return null;

          return (
            <Card key={bucket} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: AGING_COLORS[bucket] }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {bucket} ({data.count} tickets)
                  </h3>
                </div>
                {data.count > 10 && (
                  <span className="text-sm text-gray-500">
                    Showing first 10 of {data.count}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assignee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Age
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={`/incidents/${ticket.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {ticket.ticket_number}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md truncate">
                            {ticket.title}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              ticket.priority === 'CRITICAL'
                                ? 'danger'
                                : ticket.priority === 'HIGH'
                                ? 'warning'
                                : ticket.priority === 'MEDIUM'
                                ? 'primary'
                                : 'success'
                            }
                          >
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge>{ticket.status}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {ticket.assignee_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {ticket.age_days}d {ticket.age_hours % 24}h
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TicketAgingReport;
