import api from './api';

// Get HTML string for preview iframe
export async function getContractHTML(id: string): Promise<string> {
  const { data } = await api.get<{ html: string }>(`/contracts/${id}/html`, {
    withCredentials: true,
  });
  return data.html ?? '';
}

// Download PDF (opens browser save dialog)
export async function downloadContractPDF(id: string) {
  const res = await api.get(`/contracts/${id}/pdf`, {
    responseType: 'blob',
    withCredentials: true,
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `contract-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// Download DOCX (Word)
export async function downloadContractDOCX(id: string) {
  const res = await api.get(`/contracts/${id}/doc`, {
    responseType: 'blob',
    withCredentials: true,
  });
  const blob = new Blob([res.data], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contract-${id}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Optionally return the Blob if you want to handle it elsewhere
export async function fetchContractPDFBlob(id: string): Promise<Blob> {
  const res = await api.get(`/contracts/${id}/pdf`, {
    responseType: 'blob',
    withCredentials: true,
  });
  return new Blob([res.data], { type: 'application/pdf' });
}
