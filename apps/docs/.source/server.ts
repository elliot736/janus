// @ts-nocheck
import * as __fd_glob_20 from "../content/docs/integration/react.mdx?collection=docs"
import * as __fd_glob_19 from "../content/docs/integration/nextjs.mdx?collection=docs"
import * as __fd_glob_18 from "../content/docs/integration/html.mdx?collection=docs"
import * as __fd_glob_17 from "../content/docs/integration/express.mdx?collection=docs"
import * as __fd_glob_16 from "../content/docs/getting-started/quickstart.mdx?collection=docs"
import * as __fd_glob_15 from "../content/docs/getting-started/docker.mdx?collection=docs"
import * as __fd_glob_14 from "../content/docs/getting-started/configuration.mdx?collection=docs"
import * as __fd_glob_13 from "../content/docs/features/webhooks.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/features/risk-scoring.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/features/plugins.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/features/geoip.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/features/gdpr.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/features/alerting.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/features/adaptive-difficulty.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/api-reference/siteverify.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/api-reference/endpoints.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/index.mdx?collection=docs"
import { default as __fd_glob_3 } from "../content/docs/integration/meta.json?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/features/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/getting-started/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/api-reference/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"api-reference/meta.json": __fd_glob_0, "getting-started/meta.json": __fd_glob_1, "features/meta.json": __fd_glob_2, "integration/meta.json": __fd_glob_3, }, {"index.mdx": __fd_glob_4, "api-reference/endpoints.mdx": __fd_glob_5, "api-reference/siteverify.mdx": __fd_glob_6, "features/adaptive-difficulty.mdx": __fd_glob_7, "features/alerting.mdx": __fd_glob_8, "features/gdpr.mdx": __fd_glob_9, "features/geoip.mdx": __fd_glob_10, "features/plugins.mdx": __fd_glob_11, "features/risk-scoring.mdx": __fd_glob_12, "features/webhooks.mdx": __fd_glob_13, "getting-started/configuration.mdx": __fd_glob_14, "getting-started/docker.mdx": __fd_glob_15, "getting-started/quickstart.mdx": __fd_glob_16, "integration/express.mdx": __fd_glob_17, "integration/html.mdx": __fd_glob_18, "integration/nextjs.mdx": __fd_glob_19, "integration/react.mdx": __fd_glob_20, });