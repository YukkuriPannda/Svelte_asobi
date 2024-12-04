/*import { error, json} from '@sveltejs/kit';
import { type BlogData } from '../../routes/blog.json';
export const load = async({ fetch }: any)=> {
    const res_blog_data: Response = await fetch('/blog.json');
    const json = await res_blog_data.json()
    return {
        props: { json }
    };
}
*/