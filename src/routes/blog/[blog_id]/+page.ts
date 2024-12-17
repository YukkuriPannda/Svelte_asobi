import fs from "fs";
export interface BlogData {
    md: string,
    filename: string
}
export const load = async({fetch,params}:any)=>{
    return {blogid:params.blog_id}
}