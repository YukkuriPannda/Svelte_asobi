// contentlayer.config.js
import { defineDocumentType, defineNestedType, makeSource } from "contentlayer/source-files";
import path from "path";
var computedFields = {
  slug: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath.split("/").slice(1).join("/")
  },
  slugFull: {
    type: "string",
    resolve: (doc) => `/${doc._raw.flattenedPath}`
  },
  fileName: {
    type: "string",
    resolve: (doc) => path.parse(doc._raw.sourceFilePath.split("/").slice(-1).join("/")).name
  },
  suffix: {
    type: "string",
    resolve: (doc) => path.parse(doc._raw.sourceFilePath.split("/").slice(-1).join("/")).ext
  }
};
var Author = defineNestedType(() => ({
  name: "Author",
  fields: {
    name: { type: "string", required: true },
    handle: { type: "string", required: true },
    avatar: { type: "string", required: true }
  }
}));
var Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `posts/**/*.md`,
  // contentType: 'mdx',
  fields: {
    draft: {
      type: "boolean",
      description: "Disable in production mode",
      default: false
    },
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string"
    },
    thumnail_path: {
      type: "string"
    },
    date: {
      type: "date",
      required: true
    },
    authors: {
      type: "list",
      of: Author,
      required: false
    }
  },
  computedFields
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "./content",
  documentTypes: [Post],
  disableImportAliasWarning: true
});
export {
  Post,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-JP5Y3CL5.mjs.map
