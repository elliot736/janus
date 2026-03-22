// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "api-reference/endpoints.mdx": () => import("../content/docs/api-reference/endpoints.mdx?collection=docs"), "api-reference/siteverify.mdx": () => import("../content/docs/api-reference/siteverify.mdx?collection=docs"), "features/adaptive-difficulty.mdx": () => import("../content/docs/features/adaptive-difficulty.mdx?collection=docs"), "features/alerting.mdx": () => import("../content/docs/features/alerting.mdx?collection=docs"), "features/gdpr.mdx": () => import("../content/docs/features/gdpr.mdx?collection=docs"), "features/geoip.mdx": () => import("../content/docs/features/geoip.mdx?collection=docs"), "features/plugins.mdx": () => import("../content/docs/features/plugins.mdx?collection=docs"), "features/risk-scoring.mdx": () => import("../content/docs/features/risk-scoring.mdx?collection=docs"), "features/webhooks.mdx": () => import("../content/docs/features/webhooks.mdx?collection=docs"), "getting-started/configuration.mdx": () => import("../content/docs/getting-started/configuration.mdx?collection=docs"), "getting-started/docker.mdx": () => import("../content/docs/getting-started/docker.mdx?collection=docs"), "getting-started/quickstart.mdx": () => import("../content/docs/getting-started/quickstart.mdx?collection=docs"), "integration/express.mdx": () => import("../content/docs/integration/express.mdx?collection=docs"), "integration/html.mdx": () => import("../content/docs/integration/html.mdx?collection=docs"), "integration/nextjs.mdx": () => import("../content/docs/integration/nextjs.mdx?collection=docs"), "integration/react.mdx": () => import("../content/docs/integration/react.mdx?collection=docs"), }),
};
export default browserCollections;