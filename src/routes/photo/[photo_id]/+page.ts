export interface PhotoPost {
    md: string;
    filename: string;
}
export const load = async ({ params }: any) => {
    return { photoid: params.photo_id };
};
