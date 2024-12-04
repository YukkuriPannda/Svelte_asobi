import fs from "fs";
export interface BlogData {
    md: string,
    filename: string
}
export const load = async({fetch,params}:any)=>{
    console.log("hello world")
    async function load_mdfile(){
        let md = fs.readFileSync(`static/Blogs/${params.blog_id}`, "utf8")
        console.log(md)
        return { md: md, filename: params.blog_id }
    }
    return {article:load_mdfile()}
}