import fs from "fs";
export interface BlogData {
    md: string,
    filename: string
}
export const load = async({fetch,data}:any)=>{
    console.log("hello world")
    async function load_mdfile(){
        let markdownFileName = await fs.readdirSync("static/Blogs")
        console.log(`markdownFileName${markdownFileName}`)
        if (!markdownFileName) {
            return 404;
        }

        let markdowns: BlogData[] = [];
        markdownFileName.forEach(name => {
            markdowns.push({ md: fs.readFileSync(`static/Blogs/${name}`, "utf8"), filename: name })
        });
        console.log(markdowns)
        return markdowns
    }
    return {articles:load_mdfile()}
}