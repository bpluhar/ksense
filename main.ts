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
  const limit = pagination.limit;

  try {
    const firstRes = await fetch(`${BASE_URL}/patients?page=1&limit=${limit}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });
    if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}`);
    const firstJson = await firstRes.json();

    patients = firstJson.data;
    pagination = firstJson.pagination;
    metadata = firstJson.metadata;
  } catch (err) {
    if (err == "Error: HTTP 429") {
      console.log("Rate limit exceeded, retrying in 1 second");
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchPatientData();
      return;
    } else {
      console.error('Failed first patients fetch:', err);
      return;
    }
  }

  const totalPages = pagination.totalPages;

  try {
    for (let page = 2; page <= totalPages; page++) {
      const res = await fetch(`${BASE_URL}/patients?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const newPatients: Patient[] = json.data;
      patients = patients.concat(newPatients);
    }
  } catch (err) {
    if (err == "Error: HTTP 429") {
      console.log("Rate limit exceeded, retrying in 1 second");
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchPatientData();
      return;
    } else {
      console.error('Failed remaining patients fetch:', err);
      return;
    }
  }
}



fetchPatientData().then(() => {
  console.log(`Received Patients: ${patients.length} of ${pagination.total}`);
});
