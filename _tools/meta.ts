import { BuildOptions } from "https://deno.land/x/dnt@0.34.0/mod.ts";

export const makeOptions = (version: string): BuildOptions => ({
  test: false,
  shims: {},
  compilerOptions: {
    lib: ["esnext", "dom", "dom.iterable"],
  },
  typeCheck: true,
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  package: {
    name: "@httpland/auth-middleware",
    version,
    description: "HTTP authentication middleware",
    keywords: [
      "http",
      "middleware",
      "auth",
      "authentication",
      "framework",
      "auth-scheme",
      "basic",
      "bearer",
      "digest",
    ],
    license: "MIT",
    homepage: "https://github.com/httpland/auth-middleware",
    repository: {
      type: "git",
      url: "git+https://github.com/httpland/auth-middleware.git",
    },
    bugs: {
      url: "https://github.com/httpland/auth-middleware/issues",
    },
    sideEffects: false,
    type: "module",
    publishConfig: {
      access: "public",
    },
  },
  packageManager: "pnpm",
  mappings: {
    "https://deno.land/x/http_middleware@1.0.0/mod.ts": {
      name: "@httpland/http-middleware",
      version: "1.0.0",
    },
    "https://deno.land/x/isx@1.3.1/is_string.ts": {
      name: "@miyauci/isx",
      version: "1.3.1",
      subPath: "is_string.js",
    },
    "https://deno.land/x/isx@1.3.1/is_object.ts": {
      name: "@miyauci/isx",
      version: "1.3.1",
      subPath: "is_object.js",
    },
    "https://deno.land/x/isx@1.3.1/is_boolean.ts": {
      name: "@miyauci/isx",
      version: "1.3.1",
      subPath: "is_boolean.js",
    },
    "https://deno.land/x/isx@1.3.1/is_undefined.ts": {
      name: "@miyauci/isx",
      version: "1.3.1",
      subPath: "is_undefined.js",
    },
    "https://deno.land/x/isx@1.3.1/is_null.ts": {
      name: "@miyauci/isx",
      version: "1.3.1",
      subPath: "is_null.js",
    },
    "https://deno.land/x/http_utils@1.2.0/header.ts": {
      name: "@httpland/http-utils",
      version: "1.2.0",
      subPath: "header.js",
    },
    "https://deno.land/x/authorization_parser@1.1.0/mod.ts": {
      name: "@httpland/authorization-parser",
      version: "1.1.0",
    },
    "https://deno.land/x/result_js@1.0.0/mod.ts": {
      name: "@miyauci/result",
      version: "1.0.0",
    },
  },
});
