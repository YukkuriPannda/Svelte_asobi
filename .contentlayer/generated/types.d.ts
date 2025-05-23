// NOTE This file is auto-generated by Contentlayer

import type { Markdown, MDX, ImageFieldData, IsoDateTimeString } from 'contentlayer/core'
import * as Local from 'contentlayer/source-files'

export { isType } from 'contentlayer/client'

export type { Markdown, MDX, ImageFieldData, IsoDateTimeString }

/** Document types */
export type Post = {
  /** File path relative to `contentDirPath` */
  _id: string
  _raw: Local.RawDocumentData
  type: 'Post'
  /** Disable in production mode */
  draft: boolean
  title: string
  description?: string | undefined
  thumnail_path?: string | undefined
  date: IsoDateTimeString
  authors?: Author[] | undefined
  /** Markdown file body */
  body: Markdown
  slug: string
  slugFull: string
  fileName: string
  suffix: string
}  

/** Nested types */
export type Author = {
  /** File path relative to `contentDirPath` */
  _id: string
  _raw: Local.RawDocumentData
  type: 'Author'
  name: string
  handle: string
  avatar: string

}  

/** Helper types */

export type AllTypes = DocumentTypes | NestedTypes
export type AllTypeNames = DocumentTypeNames | NestedTypeNames

export type DocumentTypes = Post
export type DocumentTypeNames = 'Post'

export type NestedTypes = Author
export type NestedTypeNames = 'Author'

export type DataExports = {
  allDocuments: DocumentTypes[]
  allPosts: Post[]
}


export interface ContentlayerGenTypes {
  documentTypes: DocumentTypes
  documentTypeMap: DocumentTypeMap
  documentTypeNames: DocumentTypeNames
  nestedTypes: NestedTypes
  nestedTypeMap: NestedTypeMap
  nestedTypeNames: NestedTypeNames
  allTypeNames: AllTypeNames
  dataExports: DataExports
}

declare global {
  interface ContentlayerGen extends ContentlayerGenTypes {}
}

export type DocumentTypeMap = {
  Post: Post
}

export type NestedTypeMap = {
  Author: Author
}

 