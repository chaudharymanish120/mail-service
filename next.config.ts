import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The resume PDF lives outside `public/` (so it's never served directly) but is read
  // from disk by the API routes below. Next's build tracer doesn't always catch a
  // runtime fs.readFile call, so it's declared explicitly to make sure it ships with
  // the deployed functions.
  outputFileTracingIncludes: {
    'app/api/send-email/route': ['./resume/**'],
    'app/api/config/route': ['./resume/**'],
  },
};

export default nextConfig;
