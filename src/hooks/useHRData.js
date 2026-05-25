import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

const initialState = {
  employees: [],
  leaveRequests: [],
  leaveTypes: [],
  attendance: [],
  expenses: [],
  payrollRuns: [],
  jobs: [],
  applications: [],
  documents: [],
  reviews: [],
  assets: [],
  stats: {},
  loading: true,
  error: ''
};

export function useHRData(enabled) {
  const [data, setData] = useState(initialState);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setData((current) => ({ ...current, loading: true, error: '' }));
    const requests = await Promise.allSettled([
      api.get('/api/employees'),
      api.get('/api/leave-requests'),
      api.get('/api/leave-requests/types'),
      api.get('/api/attendance'),
      api.get('/api/expenses'),
      api.get('/api/payroll/runs'),
      api.get('/api/recruitment/jobs'),
      api.get('/api/recruitment/applications'),
      api.get('/api/documents'),
      api.get('/api/performance/reviews'),
      api.get('/api/reports/dashboard'),
      api.get('/api/assets')
    ]);

    const value = (index, fallback) => requests[index].status === 'fulfilled' ? requests[index].value : fallback;
    const firstCriticalError = requests.slice(0, 6).find((request) => request.status === 'rejected');
    const optionalError = requests.slice(6).find((request) => request.status === 'rejected');

    setData({
      employees: value(0, []),
      leaveRequests: value(1, []),
      leaveTypes: value(2, []),
      attendance: value(3, []),
      expenses: value(4, []),
      payrollRuns: value(5, []),
      jobs: value(6, []),
      applications: value(7, []),
      documents: value(8, []),
      reviews: value(9, []),
      stats: value(10, {}),
      assets: value(11, []),
      loading: false,
      error: firstCriticalError?.reason.message || optionalError?.reason.message || ''
    });
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, refresh };
}
