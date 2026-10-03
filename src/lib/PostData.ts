import blog_posts from "$lib/generated/blog_output.json";
import photo_posts from "$lib/generated/photo_output.json";
export type BlogPost = {
  draft: boolean;
  title: string;
  id: string;
  date?: string;
  tags?: string[];
  description?: string;
  thumbnail_path?: string;
  content?: string;
};
export type PhotoPost = {
  draft: boolean;
  title: string;
  id: string;
  date?: string;
  tags?: string[];
  img_path?: string;
  equipments?: string[];
  explanation?: string;
};
export const blogPost = blog_posts as BlogPost[];
export const photoPost = photo_posts as PhotoPost[];
