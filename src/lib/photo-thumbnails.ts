export function photoThumbnailUrl(id: string): string {
	const filename = `${encodeURIComponent(id)}.webp`;
	return `/photo-thumbnails/${encodeURIComponent(filename)}`;
}
