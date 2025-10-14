import { Patient, Pagination, Metadata } from './types';

const API_KEY = 'ak_322e3646b8b8083e7cbd7890a9ca2fc73b08552d5093de17';
const BASE_URL = 'https://assessment.ksensetech.com/api';

let patients: Patient[] = [];
let pagination: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false
};
let metadata: Metadata = {
  timestamp: '',
  version: '',
  requestId: ''
};

async function fetchPatientData(): Promise<void> {
  const response = await fetch(`${BASE_URL}/patients?page=1&limit=10`, {
    method: 'GET',
    headers: {
      'x-api-key': API_KEY
    }
  });
  const data = await response.json();
  patients = data.data;
  pagination = data.pagination;
  metadata = data.metadata;
}

fetchPatientData().then(() => {
  console.log(patients, pagination, metadata);
});
