import fs from "node:fs";
import { main } from "./pipeline.js";
import path from "node:path";


const ingestAllFiles = async () => {
    const dirPath = './src/ragData';
    const documentsPath =  fs.readdirSync(dirPath)

for (const documentPath of documentsPath) {
    await main(path.join(dirPath, documentPath))
}
}

ingestAllFiles()