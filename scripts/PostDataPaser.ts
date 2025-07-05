import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { BlogPost } from "../src/lib/PostData";
import { PhotoPost } from "../src/lib/PostData";
const blogDirPath = "content/posts/";
const blogOutputFilePath = "src/lib/generated/blog_output.json";
const photoDirPath = "content/photos/";
const photoOutputFilePath = "src/lib/generated/photo_output.json";

const parsePhotoMarkdownFilesToJSON = () => {
  const allPosts: PhotoPost[] = [];

  const fullDirPath = path.resolve(photoDirPath);
  const files = fs.readdirSync(fullDirPath);

  files.forEach((file) => {
    if (path.extname(file) === ".md") {
      const filePath = path.join(fullDirPath, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      const explanation = marked(content);
      allPosts.push(
        { ...data, explanation, id: path.basename(file, ".md") } as PhotoPost,
      );
    }
  });
  fs.writeFileSync(
    photoOutputFilePath,
    JSON.stringify(allPosts, null, 2),
    "utf-8",
  );
  console.log(`JSON file created at: ${photoOutputFilePath}`);
};
const parseBlogMarkdownFilesToJSON = () => {
  const allPosts: BlogPost[] = [];

  const fullDirPath = path.resolve(blogDirPath);
  const files = fs.readdirSync(fullDirPath);

  files.forEach((file) => {
    if (path.extname(file) === ".md") {
      const filePath = path.join(fullDirPath, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      const content_html = marked(content);
      allPosts.push(
        {
          ...data,
          content: content_html,
          id: path.basename(file, ".md"),
        } as BlogPost,
      );
    }
  });
  fs.writeFileSync(
    blogOutputFilePath,
    JSON.stringify(allPosts, null, 2),
    "utf-8",
  );
  console.log(`JSON file created at: ${blogOutputFilePath}`);
};

parseBlogMarkdownFilesToJSON();
parsePhotoMarkdownFilesToJSON();
