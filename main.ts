import { Patient, Pagination, Metadata } from './types';

const API_KEY = 'ak_322e3646b8b8083e7cbd7890a9ca2fc73b08552d5093de17';
const BASE_URL = 'https://assessment.ksensetech.com/api';

async function fetchPatientData() {
  const response = await fetch(`${BASE_URL}/patients`, {
    method: 'GET',
    headers: {
      'x-api-key': API_KEY
    }
  });
  const data = await response.json();
  return data;
}

fetchPatientData().then(data => {
  console.log(data);
});