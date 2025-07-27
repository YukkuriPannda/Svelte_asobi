import blog_data from '$lib/generated/blog_output.json';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () => {
	return blog_data.map((blog) => ({
		blog_id: blog.id
	}));
};
export const prerender = true;

export interface BlogData {
    md: string;
    filename: string;
}
export const load = async ({ params }: any) => {
    return { blogid: params.blog_id };
};