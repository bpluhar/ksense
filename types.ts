export type Patient = {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  blood_pressure: string;
  temperature: number;
  visit_date: string;
  diagnosis: string;
  medications: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type Metadata = {
  timestamp: string;
  version: string;
  requestId: string;
};