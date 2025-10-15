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

let maxRetries = 5;

function isRetriableError(err: unknown): boolean {
  return err instanceof Error && /HTTP\s(429|500|503|502)/.test(err.message);
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(page: number, limit: number): Promise<{ data: Patient[]; pagination?: Pagination; metadata?: Metadata; }>
{
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/patients?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {  
          'x-api-key': API_KEY
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: Patient[] = json.data;
      return { data, pagination: json?.pagination, metadata: json?.metadata };
    } catch (err) {
      if (isRetriableError(err) && attempt < maxRetries) {
        const waitMs = attempt * 1000;
        await wait(waitMs);
        continue;
      }
      console.error(`Page ${page} failed:`, err);
      throw err;
    }
  }
  throw new Error(`Page ${page} failed after ${maxRetries} attempts`);
}

async function fetchFirstPage(limit: number): Promise<void> {
  if (firstFetch) return;
  try {
    const { data, pagination: pg, metadata: md } = await fetchPage(1, limit);
    firstFetch = true;
    patients = data;
    if (pg) pagination = pg;
    if (md) metadata = md;
    retryCount = 0;
  } catch (err) {
    if (isRetriableError(err)) {
      retryCount++;
      await wait(retryCount * 1000);
      await fetchFirstPage(limit);
      return;
    }
    console.error('Failed first patients fetch:', err);
  }
}

async function fetchRemainingPages(limit: number): Promise<void> {
  const totalPages = pagination.totalPages || 1;
  for (let page = 2; page <= totalPages; page++) {
    try {
      const { data } = await fetchPage(page, limit);
      patients = patients.concat(data);
      await wait(200);
    } catch (err) {
      if (isRetriableError(err)) {
        retryCount++;
        await wait(retryCount * 1000);
        page--;
        continue;
      }
      console.error('Failed remaining patients fetch:', err);
      return;
    }
  }
  retryCount = 0;
}

async function fetchPatientData(): Promise<void> {
  const limit = pagination.limit;
  await fetchFirstPage(limit);
  if (!firstFetch) return;
  await fetchRemainingPages(limit);
  if (patients.length !== pagination.total) {
    console.warn(`Warning: fetched ${patients.length} patients, expected ${pagination.total}`);
  } else {
    console.log(`Success: fetched all ${patients.length} patients`);
  }
}

fetchPatientData().then(() => {
  console.log(`Received Patients: ${patients.length} of ${pagination.total}`);
});
