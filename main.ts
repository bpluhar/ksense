import { Patient, Pagination, Metadata } from './types';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://assessment.ksensetech.com/api';

const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
  console.warn('API_KEY is not set. Provide it via env (API_KEY=...) or dotenv.');
}

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


function scoreBloodPressure(bp: string | null | undefined): { score: number; valid: boolean } {
  const { systolic, diastolic } = parseBloodPressure(bp);
  if (systolic == null || diastolic == null) return { score: 0, valid: false };
  if (systolic >= 140 || diastolic >= 90) return { score: 4, valid: true };
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { score: 3, valid: true };
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return { score: 2, valid: true };
  if (systolic < 120 && diastolic < 80) return { score: 1, valid: true };
  return { score: 0, valid: false };
}

function parseBloodPressure(bp: string | null | undefined): { systolic: number | null; diastolic: number | null } {
  if (!bp || typeof bp !== 'string') return { systolic: null, diastolic: null };
  const parts = bp.split('/').map(s => s.trim());
  if (parts.length !== 2) return { systolic: null, diastolic: null };
  const sys = Number(parts[0]);
  const dia = Number(parts[1]);
  return { systolic: sys, diastolic: dia };
}

function sortData(patients: Patient[]): { high_risk_patients: string[]; } {
  const highRisk: string[] = [];

  for (const patient of patients) {
    const bp = scoreBloodPressure(patient.blood_pressure);

    const totalScore = bp.score;

    if (totalScore >= 4) highRisk.push(patient.patient_id);
  }

  return {
    high_risk_patients: highRisk
  };
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

  const alerts = sortData(patients);
  console.log(alerts);
}

fetchPatientData().then(() => {
  console.log(`Received Patients: ${patients.length} of ${pagination.total}`);
});
