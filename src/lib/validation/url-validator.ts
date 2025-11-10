/**
 * URL Validation Service
 *
 * Validates source URLs for political promises to ensure:
 * 1. URL is accessible (HTTP 200 or valid redirect)
 * 2. Content exists at the URL
 * 3. Archive.org fallback if original is dead
 * 4. Proper error handling and retry logic
 */

export type URLHealthStatus =
  | 'unchecked'
  | 'valid'
  | 'redirect'
  | 'client_error'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'invalid_format'
  | 'archived_only';

export interface URLValidationResult {
  status: URLHealthStatus;
  httpStatus: number | null;
  redirectUrl: string | null;
  archiveUrl: string | null;
  errorMessage: string | null;
  isAccessible: boolean;
  responseTime: number; // milliseconds
}

const URL_VALIDATION_TIMEOUT = 10000; // 10 seconds
const MAX_REDIRECTS = 5;
const USER_AGENT = 'Mozilla/5.0 (compatible; PolitikCred/1.0; +https://politik-cred.netlify.app)';

/**
 * Validates if a URL is accessible
 */
export async function validateURL(url: string): Promise<URLValidationResult> {
  const startTime = Date.now();

  // Step 1: Basic URL format validation
  try {
    new URL(url);
  } catch {
    return {
      status: 'invalid_format',
      httpStatus: null,
      redirectUrl: null,
      archiveUrl: null,
      errorMessage: 'Invalid URL format',
      isAccessible: false,
      responseTime: Date.now() - startTime
    };
  }

  // Step 2: Attempt to fetch the URL
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), URL_VALIDATION_TIMEOUT);

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading full content
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal,
      redirect: 'manual' // Handle redirects manually
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    // Handle different HTTP status codes
    if (response.status >= 200 && response.status < 300) {
      return {
        status: 'valid',
        httpStatus: response.status,
        redirectUrl: null,
        archiveUrl: null,
        errorMessage: null,
        isAccessible: true,
        responseTime
      };
    }

    // Handle redirects (301, 302, 307, 308)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        // Follow redirect and validate final URL
        const finalUrl = new URL(location, url).href;
        const redirectResult = await validateURL(finalUrl);

        return {
          ...redirectResult,
          status: 'redirect',
          redirectUrl: finalUrl,
          responseTime
        };
      }
    }

    // Handle client errors (4xx)
    if (response.status >= 400 && response.status < 500) {
      // Try archive.org as fallback
      const archiveResult = await checkArchiveOrg(url);

      return {
        status: archiveResult.archived ? 'archived_only' : 'client_error',
        httpStatus: response.status,
        redirectUrl: null,
        archiveUrl: archiveResult.archiveUrl,
        errorMessage: `HTTP ${response.status}: ${getHTTPStatusMessage(response.status)}`,
        isAccessible: archiveResult.archived,
        responseTime
      };
    }

    // Handle server errors (5xx)
    if (response.status >= 500) {
      return {
        status: 'server_error',
        httpStatus: response.status,
        redirectUrl: null,
        archiveUrl: null,
        errorMessage: `HTTP ${response.status}: Server error`,
        isAccessible: false,
        responseTime
      };
    }

    // Unknown status
    return {
      status: 'network_error',
      httpStatus: response.status,
      redirectUrl: null,
      archiveUrl: null,
      errorMessage: `Unexpected HTTP status: ${response.status}`,
      isAccessible: false,
      responseTime
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        status: 'timeout',
        httpStatus: null,
        redirectUrl: null,
        archiveUrl: null,
        errorMessage: `Request timed out after ${URL_VALIDATION_TIMEOUT}ms`,
        isAccessible: false,
        responseTime
      };
    }

    // Handle network errors
    return {
      status: 'network_error',
      httpStatus: null,
      redirectUrl: null,
      archiveUrl: null,
      errorMessage: error instanceof Error ? error.message : 'Unknown network error',
      isAccessible: false,
      responseTime
    };
  }
}

/**
 * Check if URL is available on archive.org (Wayback Machine)
 */
async function checkArchiveOrg(originalUrl: string): Promise<{
  archived: boolean;
  archiveUrl: string | null;
}> {
  try {
    // Query Wayback Machine API for most recent snapshot
    const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(originalUrl)}`;

    const response = await fetch(availabilityUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      return { archived: false, archiveUrl: null };
    }

    const data = await response.json();

    if (data.archived_snapshots?.closest?.available) {
      return {
        archived: true,
        archiveUrl: data.archived_snapshots.closest.url
      };
    }

    return { archived: false, archiveUrl: null };
  } catch {
    // If archive.org check fails, don't block the main validation
    return { archived: false, archiveUrl: null };
  }
}

/**
 * Get human-readable HTTP status message
 */
function getHTTPStatusMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    410: 'Gone',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };

  return messages[status] || 'Unknown Error';
}

/**
 * Batch validate multiple URLs (with rate limiting)
 */
export async function validateURLsBatch(
  urls: string[],
  delayMs: number = 100
): Promise<Map<string, URLValidationResult>> {
  const results = new Map<string, URLValidationResult>();

  for (const url of urls) {
    const result = await validateURL(url);
    results.set(url, result);

    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Validate and update promise URL in database
 */
export interface URLUpdateData {
  source_url_status: URLHealthStatus;
  source_url_http_status: number | null;
  source_url_last_checked: string;
  source_url_redirect_url: string | null;
  source_url_archive_url: string | null;
  source_url_error_message: string | null;
  url_check_attempts: number;
}

export async function getURLUpdateData(
  validationResult: URLValidationResult,
  currentAttempts: number = 0
): Promise<URLUpdateData> {
  return {
    source_url_status: validationResult.status,
    source_url_http_status: validationResult.httpStatus,
    source_url_last_checked: new Date().toISOString(),
    source_url_redirect_url: validationResult.redirectUrl,
    source_url_archive_url: validationResult.archiveUrl,
    source_url_error_message: validationResult.errorMessage,
    url_check_attempts: currentAttempts + 1
  };
}
