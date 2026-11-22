const buckets = new Map();
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets) if (now >= value.resetAt) buckets.delete(key);
}, 60_000);
cleanup.unref?.();

function rateLimit({ windowMs, max, key = (req) => req.ip || req.socket.remoteAddress || 'unknown', name }) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${name}:${key(req)}`;
    let bucket = buckets.get(bucketKey);
    if (!bucket || now >= bucket.resetAt) bucket = { count: 0, resetAt: now + windowMs };
    if (buckets.size > 10_000 && !buckets.has(bucketKey)) {
      for (const [key, value] of buckets) {
        if (now >= value.resetAt) buckets.delete(key);
        if (buckets.size <= 8_000) break;
      }
    }
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.set('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.', requestId: req.requestId || 'unavailable' });
    }
    next();
  };
}

const loginLimit = rateLimit({ name: 'login', windowMs: 15 * 60 * 1000, max: 10 });
const publicVerificationLimit = rateLimit({ name: 'certificate-verification', windowMs: 60 * 1000, max: 60 });
const apiLimit = rateLimit({ name: 'api', windowMs: 60 * 1000, max: 300 });

module.exports = { loginLimit, publicVerificationLimit, apiLimit, rateLimit };
