// import pdf
// convert into md
// structure aware chunking 
// make sure the chunks have appropriate metadata
// embed chunks using ai model
// store into vector db.

import { Document } from "langchain";
import { exec, execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileAsync = promisify(execFile)

const pdfToMarkdow = async (fileName: string): Promise<string> => {
    const { stdout, stderr } = await execFileAsync('python3', ['src/python/pdftomd.py', fileName])
    if (stderr) {
        throw Error('Error when parsing pdf to md \n' + stderr)
    }

    return stdout
}

export const main = async () => {
    console.log(await pdfToMarkdow('src/data/nsw-tenancy.pdf'))
}

