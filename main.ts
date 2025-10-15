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

let retryCount = 0;
let firstFetch = false;

async function fetchPatientData(): Promise<void> {
  const limit = pagination.limit;

  if (!firstFetch) {
    try {
      console.log("Fetching first page");
      const firstRes = await fetch(`${BASE_URL}/patients?page=1&limit=${limit}`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY
        }
      });
      if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}`);

      const firstJson = await firstRes.json();
      firstFetch = true;
      patients = firstJson.data;
      pagination = firstJson.pagination;
      metadata = firstJson.metadata;
    } catch (err) {
      if (err == "Error: HTTP 429") {
        retryCount++;
        console.log(`Rate limit exceeded, retrying in ${retryCount} seconds`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        await fetchPatientData();
        return;
      } else if (err == "Error: HTTP 500" || err == "Error: HTTP 503" || err == "Error: HTTP 502") {
        retryCount++;
        console.log(`Server error, retrying in ${retryCount} seconds`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        await fetchPatientData();
        return;
      } else {
        console.error('Failed first patients fetch:', err);
        return;
      }
    }
    retryCount = 0;
  }

  console.log(retryCount);
  const totalPages = pagination.totalPages;

  try {
    // console.log(retryCount);
    for (let page = 2; page <= totalPages; page++) {
      console.log(`Fetching page ${page} of ${totalPages}`);
      const res = await fetch(`${BASE_URL}/patients?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY
        }
      });
      // if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const newPatients: Patient[] = json.data;
      patients = patients.concat(newPatients);
    }
  } catch (err) {
    if (err == "Error: HTTP 429") {
      retryCount++;
      console.log(`Rate limit exceeded, retrying in ${retryCount} seconds`);
      await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
      await fetchPatientData();
      return;
    } else if (err == "Error: HTTP 500" || err == "Error: HTTP 503" || err == "Error: HTTP 502") {
      retryCount++;
      console.log(`Server error, retrying in ${retryCount} seconds`);
      await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
      await fetchPatientData();
      return;
    } else {
      console.error('Failed remaining patients fetch:', err);
      return;
    }
    retryCount = 0;
  }
}



fetchPatientData().then(() => {
  console.log(`Received Patients: ${patients.length} of ${pagination.total}`);
});
