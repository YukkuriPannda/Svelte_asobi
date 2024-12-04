import fs from "fs"
export interface BlogData {
    md: string,
    filename: string
}
export async function get({ params }: any) {
    const { path } = params
    const markdownFileName: string[] = fs.readdirSync("./blog").filter(fileName => fileName.endsWith(`${path}.md`))

    if (!markdownFileName) {
        return 404;
    }

    let markdowns: BlogData[] = [];
    markdownFileName.forEach(name => {
        markdowns.push({ md: fs.readFileSync(`./blog/${name}`, "utf8"), filename: name })
    });

    return {
        body: markdowns,
    }
}