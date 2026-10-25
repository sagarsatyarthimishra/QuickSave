
const API_BASE_URL = 'http://192.168.1.7:5000';
// Replace with your PC's actual IPv4 address.

export type UrlValidationResult = {
  success: boolean;
  platform?: string;
  directVideo?: boolean;
  message: string;
};

export async function validateVideoUrl(
  url: string
): Promise<UrlValidationResult> {
  const response = await fetch(`${API_BASE_URL}/api/validate-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'URL validation failed');
  }

  return data;
}
