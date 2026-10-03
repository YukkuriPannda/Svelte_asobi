import photo_data from '$lib/generated/photo_output.json';
import type { EntryGenerator } from './$types';

export const entries: EntryGenerator = () => {
	return photo_data.map((photo) => ({
		photo_id: photo.id
	}));
};
export const prerender = true;
export interface PhotoPost {
    md: string;
    filename: string;
}
export const load = async ({ params }: any) => {
    return { photoid: params.photo_id };
};