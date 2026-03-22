import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default withMDX(config);
