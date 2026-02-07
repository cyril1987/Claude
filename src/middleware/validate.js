const ALLOWED_FREQUENCIES = [60, 300, 900, 1800, 3600];

function validateMonitor(req, res, next) {
  const errors = [];
  const { url, name, frequency, expectedStatus, timeoutMs, notifyEmail } = req.body;

  // URL validation
  if (!url || typeof url !== 'string') {
    errors.push('url is required');
  } else {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('url must use http or https protocol');
      }
      if (!parsed.hostname) {
        errors.push('url must have a valid hostname');
      }
      // Block private/internal IPs
      const host = parsed.hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host)
      ) {
        errors.push('url must not point to a private/internal address');
      }
    } catch {
      errors.push('url is not a valid URL');
    }
  }

  // Frequency validation
  if (frequency !== undefined) {
    const freq = Number(frequency);
    if (!ALLOWED_FREQUENCIES.includes(freq)) {
      errors.push(`frequency must be one of: ${ALLOWED_FREQUENCIES.join(', ')} (seconds)`);
    }
  }

  // Expected status validation
  if (expectedStatus !== undefined) {
    const status = Number(expectedStatus);
    if (!Number.isInteger(status) || status < 100 || status > 599) {
      errors.push('expectedStatus must be a valid HTTP status code (100-599)');
    }
  }

  // Timeout validation
  if (timeoutMs !== undefined) {
    const timeout = Number(timeoutMs);
    if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 30000) {
      errors.push('timeoutMs must be between 1000 and 30000');
    }
  }

  // Email validation
  if (!notifyEmail || typeof notifyEmail !== 'string') {
    errors.push('notifyEmail is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
    errors.push('notifyEmail must be a valid email address');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

module.exports = { validateMonitor, ALLOWED_FREQUENCIES };
