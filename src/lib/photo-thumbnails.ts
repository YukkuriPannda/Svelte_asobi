export function photoThumbnailUrl(id: string): string {
	const filename = `${encodeURIComponent(id)}.webp`;
	return `/photo-thumbnails/${encodeURIComponent(filename)}`;
}

export function photoOgImageUrl(id: string): string {
	const filename = `${encodeURIComponent(id)}.jpg`;
	return `/photo-og/${encodeURIComponent(filename)}`;
}
